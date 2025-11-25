import { getSupabaseClient } from '@/lib/supabase';
import { calculateShipmentAlert } from '@/lib/api/calculate-shipment-alert';
import type { AlertShipment, AlertsFilters, RiskFactorPoints } from '@/types/alerts';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function buildBaseRiskFactorPoint(shipment: any): RiskFactorPoints {
  const points = Number(shipment.calculated_risk_score) || 0;
  const expectedDelivery = shipment.expected_delivery ? new Date(shipment.expected_delivery) : null;
  const daysPastEta =
    expectedDelivery != null ? Math.max(0, Math.round((Date.now() - expectedDelivery.getTime()) / MS_IN_DAY)) : null;
  const timelineDays =
    shipment.order_date && shipment.expected_delivery
      ? Math.max(
          0,
          Math.round(
            (new Date(shipment.expected_delivery).getTime() - new Date(shipment.order_date).getTime()) / MS_IN_DAY,
          ),
        )
      : null;

  let description = 'Delay detected in planned shipment steps.';
  if (typeof daysPastEta === 'number' && daysPastEta > 0) {
    description = `${daysPastEta} day${daysPastEta === 1 ? '' : 's'} past the expected delivery milestone.`;
  } else if (typeof shipment.calculated_days_to_eta === 'number' && shipment.calculated_days_to_eta <= 0) {
    const overdue = Math.abs(shipment.calculated_days_to_eta);
    description = `${overdue} day${overdue === 1 ? '' : 's'} past the planned timeline.`;
  } else if (typeof timelineDays === 'number' && timelineDays <= 7) {
    description = `Short ${timelineDays}-day lane running behind schedule.`;
  }

  return {
    factor: 'BaseScore',
    points,
    description,
  };
}

/**
 * Shared logic for fetching alerts from database.
 * This reads from calculated_* columns in shipments table, ensuring
 * 100% consistency between alerts table and detail page.
 * 
 * If data is missing or stale, it calculates and stores it.
 */
export async function fetchAndCalculateAlerts(filters?: AlertsFilters & { shipmentId?: string }) {
  const supabase = getSupabaseClient();
  let query = supabase.from('shipments').select('*');

  // Apply filters - same logic for both routes
  if (filters?.shipmentId) {
    // For detail route, search by shipment ID
    query = query.or(`shipment_id.ilike.%${filters.shipmentId}%`);
  } else if (filters?.mode) {
    query = query.eq('mode', filters.mode);
  }
  if (filters?.carrier) {
    query = query.ilike('carrier', `%${filters.carrier}%`);
  }
  if (filters?.search) {
    const term = filters.search.toLowerCase();
    query = query.or(
      `shipment_id.ilike.%${term}%,origin_city.ilike.%${term}%,dest_city.ilike.%${term}%`,
    );
  }

  const { data: shipments, error } = await query.order('expected_delivery', {
    ascending: true,
  });

  if (error) {
    throw new Error(`Failed to fetch shipments: ${error.message}`);
  }

  if (!shipments || shipments.length === 0) {
    return [];
  }

  // Always fetch events for all shipments (needed for timeline/steps generation)
  const shipmentIds = shipments.map((s: any) => s.shipment_id);
  const { data: allEvents } = await supabase
    .from('shipment_events')
    .select('*')
    .in('shipment_id', shipmentIds)
    .order('event_time', { ascending: true });

  // Group events by shipment
  const eventsByShipment = new Map<string, any[]>();
  (allEvents || []).forEach((e: any) => {
    if (!eventsByShipment.has(e.shipment_id)) {
      eventsByShipment.set(e.shipment_id, []);
    }
    eventsByShipment.get(e.shipment_id)!.push({
      event_time: e.event_time,
      event_stage: e.event_stage,
      description: e.description,
      location: e.location,
    });
  });

  // Convert shipments to AlertShipment format using stored calculated data
  const alerts: AlertShipment[] = [];
  const needsCalculation: any[] = [];

  for (const shipment of shipments) {
    const s = shipment as any;
    const events = eventsByShipment.get(s.shipment_id) || [];

    // Check if we have stored calculated data that's recent (within last hour)
    const calculatedAt = s.calculated_at ? new Date(s.calculated_at) : null;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isStale = !calculatedAt || calculatedAt < oneHourAgo;

    // If we have fresh calculated data, use it but still generate steps from events
    if (
      !isStale &&
      s.calculated_risk_score !== null &&
      s.calculated_severity !== null &&
      s.calculated_risk_reasons !== null
    ) {
      // Use stored calculated data for risk info, but generate steps dynamically
      // Steps need to be generated from events to show actual completion times
      const alertWithSteps = calculateShipmentAlert(s, events);

      const storedPoints: RiskFactorPoints[] = Array.isArray(s.calculated_risk_factor_points)
        ? [...s.calculated_risk_factor_points]
        : [];

      const shouldAddBasePoint =
        storedPoints.length === 0 &&
        typeof s.calculated_risk_score === 'number' &&
        s.calculated_risk_score > 0 &&
        s.calculated_severity &&
        s.calculated_severity !== 'Minimal';

      const normalizedPoints = shouldAddBasePoint ? [buildBaseRiskFactorPoint(s)] : storedPoints;

      // Override with stored calculated data (for consistency) but keep steps
      alerts.push({
        ...alertWithSteps, // This includes steps generated from events
        // Override with stored calculated values (ensures consistency)
        riskScore: s.calculated_risk_score,
        severity: s.calculated_severity,
        riskReasons: s.calculated_risk_reasons || [],
        riskFactorPoints: normalizedPoints,
        status: s.calculated_status || 'in_progress',
        currentStage: s.calculated_current_stage || s.current_status,
        daysToEta: s.calculated_days_to_eta ?? 0,
        // Keep steps from calculateShipmentAlert (generated from events)
      });
    } else {
      // Mark for calculation
      needsCalculation.push(s);
    }
  }

  // Calculate missing/stale data and store it
  if (needsCalculation.length > 0) {
    // Calculate and store for each shipment
    for (const shipment of needsCalculation) {
      const s = shipment as any;
      const events = eventsByShipment.get(s.shipment_id) || [];

      // Calculate using shared function (includes steps generation)
      const calculatedAlert = calculateShipmentAlert(s, events);

      // Store in database for future reads (ensures both routes use same data)
      await supabase
        .from('shipments')
        .update({
          calculated_risk_score: calculatedAlert.riskScore,
          calculated_severity: calculatedAlert.severity,
          calculated_risk_reasons: calculatedAlert.riskReasons,
          calculated_risk_factor_points: calculatedAlert.riskFactorPoints || [],
          calculated_status: calculatedAlert.status || 'in_progress',
          calculated_current_stage: calculatedAlert.currentStage,
          calculated_days_to_eta: calculatedAlert.daysToEta,
          calculated_at: new Date().toISOString(),
        })
        .eq('shipment_id', s.shipment_id)
        .then(({ error }) => {
          if (error) {
            console.error(`Failed to store calculated data for ${s.shipment_id}:`, error);
          }
        });

      alerts.push(calculatedAlert);
    }
  }

  return alerts;
}

