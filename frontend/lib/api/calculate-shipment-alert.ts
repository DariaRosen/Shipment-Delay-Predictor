import { DelayCalculatorService, ShipmentData } from '@/lib/services/delay-calculator';
import type { AlertShipment } from '@/types/alerts';

/**
 * Shared calculation function used by both /api/alerts and /api/alerts/[shipmentId]
 * This ensures both endpoints return identical data for the same shipment.
 * Any changes to calculation logic should be made in one place only.
 */
export function calculateShipmentAlert(
  shipment: any,
  events: any[],
): AlertShipment {
  const delayCalculator = new DelayCalculatorService();
  
  const shipmentData: ShipmentData = {
    shipment_id: shipment.shipment_id,
    order_date: shipment.order_date,
    expected_delivery: shipment.expected_delivery,
    current_status: shipment.current_status,
    carrier: shipment.carrier,
    mode: shipment.mode,
    origin_city: shipment.origin_city,
    origin_country: shipment.origin_country,
    dest_city: shipment.dest_city,
    dest_country: shipment.dest_country,
    service_level: shipment.service_level,
    owner: shipment.owner,
    events: events.map((e) => ({
      event_time: e.event_time,
      event_stage: e.event_stage,
      description: e.description || undefined,
      location: e.location || undefined,
    })),
  };

  const calculatedAlert = delayCalculator.calculateAlert(shipmentData);

  return {
    ...calculatedAlert,
    acknowledged: shipment.acknowledged,
    acknowledgedBy: shipment.acknowledged_by || undefined,
    acknowledgedAt: shipment.acknowledged_at || undefined,
  };
}

