import { NextRequest, NextResponse } from 'next/server';
import { DelayCalculatorService } from '@/lib/services/delay-calculator';
import type { AlertsResponse, AlertShipment } from '@/types/alerts';
import { generateTestShipments } from '@/test-data/generate-test-shipments';
import { getAcknowledgement } from '@/lib/test-data-store';

type ShipmentStatus = 'all' | 'completed' | 'in_progress' | 'canceled' | 'future';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
    const status = (searchParams.get('status') as ShipmentStatus) || undefined;
    const search = searchParams.get('search') || undefined;

    const { shipments, events } = generateTestShipments();
    const eventsByShipment = new Map<string, typeof events>();
    for (const event of events) {
      const list = eventsByShipment.get(event.shipment_id) ?? [];
      list.push(event);
      eventsByShipment.set(event.shipment_id, list);
    }

    const filteredShipments = shipments.filter((shipment) => {
      const shipmentOrderDate = new Date(shipment.order_date);
      if (year && shipmentOrderDate.getUTCFullYear() !== year) {
        return false;
      }
      if (month && year && shipmentOrderDate.getUTCMonth() + 1 !== month) {
        return false;
      }
      if (search) {
        const term = search.toLowerCase();
        const searchable = [shipment.shipment_id, shipment.origin_city, shipment.dest_city]
          .map((value) => value.toLowerCase());
        if (!searchable.some((value) => value.includes(term))) {
          return false;
        }
      }
      return true;
    });

    const delayCalculator = new DelayCalculatorService();
    const alerts: AlertShipment[] = [];

    for (const shipment of filteredShipments) {
      const eventsForShipment = eventsByShipment.get(shipment.shipment_id) || [];
      const acknowledgement = getAcknowledgement(shipment.shipment_id);

      shipment.acknowledged = Boolean(acknowledgement);
      shipment.acknowledged_by = acknowledgement?.userId ?? null;
      shipment.acknowledged_at = acknowledgement?.timestamp ?? null;

      const calculatedAlert = delayCalculator.calculateAlert({
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
        events: eventsForShipment.map((event) => ({
          event_time: event.event_time,
          event_stage: event.event_stage,
          description: event.description,
          location: event.location,
        })),
      });

      // Apply status filter (only if status is specified and not 'all')
      if (status && status !== 'all') {
        const alertStatus = calculatedAlert.status;
        
        // Strictly match the filter status - if status doesn't match, skip this shipment
        if (status === 'completed' && alertStatus !== 'completed') {
          continue; // Skip non-completed shipments
        }
        if (status === 'in_progress' && alertStatus !== 'in_progress') {
          continue; // Skip non-in-progress shipments
        }
        if (status === 'canceled' && alertStatus !== 'canceled') {
          continue; // Skip non-canceled shipments
        }
        if (status === 'future' && alertStatus !== 'future') {
          continue; // Skip non-future shipments
        }
      }

      alerts.push({
        ...calculatedAlert,
        acknowledged: shipment.acknowledged,
        acknowledgedBy: shipment.acknowledged_by ?? undefined,
        acknowledgedAt: shipment.acknowledged_at ?? undefined,
      });
    }

    const response: AlertsResponse = {
      data: alerts,
      meta: {
        lastUpdated: new Date().toISOString(),
        count: alerts.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/alerts/shipments/all:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

