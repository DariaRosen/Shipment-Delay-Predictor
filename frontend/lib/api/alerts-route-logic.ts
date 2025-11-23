import { getSupabaseClient } from '@/lib/supabase';
import { calculateShipmentAlert } from '@/lib/api/calculate-shipment-alert';
import type { AlertShipment, AlertsFilters } from '@/types/alerts';

/**
 * Shared logic for fetching and calculating shipment alerts.
 * This is used by both /api/alerts and /api/alerts/[shipmentId] to ensure
 * 100% consistency - same data fetching, same calculation, same results.
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

  // Fetch events for all shipments - EXACT same pattern
  const shipmentIds = shipments.map((s: any) => s.shipment_id);
  const { data: allEvents } = await supabase
    .from('shipment_events')
    .select('*')
    .in('shipment_id', shipmentIds)
    .order('event_time', { ascending: true });

  // Group events by shipment - EXACT same logic
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

  // Calculate alerts using shared function - EXACT same for both routes
  const alerts: AlertShipment[] = [];
  for (const shipment of shipments) {
    const s = shipment as any;
    const events = eventsByShipment.get(s.shipment_id) || [];

    // Use shared calculation function - SAME for both routes
    const calculatedAlert = calculateShipmentAlert(s, events);

    alerts.push(calculatedAlert);
  }

  return alerts;
}

