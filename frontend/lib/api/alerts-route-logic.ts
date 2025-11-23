import { getSupabaseClient } from '@/lib/supabase';
import { calculateShipmentAlert } from '@/lib/api/calculate-shipment-alert';
import type { AlertShipment, AlertsFilters } from '@/types/alerts';

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

  // Convert shipments to AlertShipment format using stored calculated data
  const alerts: AlertShipment[] = [];
  const needsCalculation: any[] = [];

  for (const shipment of shipments) {
    const s = shipment as any;

    // Check if we have stored calculated data that's recent (within last hour)
    const calculatedAt = s.calculated_at ? new Date(s.calculated_at) : null;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isStale = !calculatedAt || calculatedAt < oneHourAgo;

    // If we have fresh calculated data, use it
    if (
      !isStale &&
      s.calculated_risk_score !== null &&
      s.calculated_severity !== null &&
      s.calculated_risk_reasons !== null
    ) {
      // Use stored calculated data - ensures consistency!
      alerts.push({
        shipmentId: s.shipment_id,
        origin: s.origin_city,
        destination: s.dest_city,
        mode: s.mode,
        carrierName: s.carrier,
        serviceLevel: s.service_level,
        currentStage: s.calculated_current_stage || s.current_status,
        plannedEta: s.expected_delivery,
        daysToEta: s.calculated_days_to_eta ?? 0,
        lastMilestoneUpdate: s.last_update || s.order_date,
        orderDate: s.order_date,
        riskScore: s.calculated_risk_score,
        severity: s.calculated_severity,
        riskReasons: s.calculated_risk_reasons || [],
        riskFactorPoints: s.calculated_risk_factor_points || [],
        owner: s.owner,
        acknowledged: s.acknowledged || false,
        acknowledgedBy: s.acknowledged_by || undefined,
        acknowledgedAt: s.acknowledged_at || undefined,
        status: s.calculated_status || 'in_progress',
      });
    } else {
      // Mark for calculation
      needsCalculation.push(s);
    }
  }

  // Calculate missing/stale data and store it
  if (needsCalculation.length > 0) {
    // Fetch events for shipments that need calculation
    const shipmentIds = needsCalculation.map((s: any) => s.shipment_id);
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

    // Calculate and store for each shipment
    for (const shipment of needsCalculation) {
      const s = shipment as any;
      const events = eventsByShipment.get(s.shipment_id) || [];

      // Calculate using shared function
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

