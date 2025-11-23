import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { calculateShipmentAlert } from '@/lib/api/calculate-shipment-alert';

/**
 * This endpoint ensures it uses the EXACT same calculation logic as /api/alerts
 * by reusing the same shared function and data fetching pattern.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const supabase = getSupabaseClient();

    // Fetch shipment using same query pattern as /api/alerts route
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('shipment_id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json(
        { error: `Shipment with id ${shipmentId} was not found` },
        { status: 404 },
      );
    }

    // Fetch events using EXACT same pattern as /api/alerts route
    // Fetch as array (like alerts route does for batch) for consistency
    const shipmentIds = [shipmentId];
    const { data: allEvents } = await supabase
      .from('shipment_events')
      .select('*')
      .in('shipment_id', shipmentIds)
      .order('event_time', { ascending: true });

    // Group events by shipment - EXACT same logic as /api/alerts route
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

    // Get events for this shipment - EXACT same format as /api/alerts route
    const events = eventsByShipment.get(shipmentId) || [];

    // Use SHARED calculation function - EXACT same as /api/alerts route
    // This ensures 100% consistency between both endpoints
    const alert = calculateShipmentAlert(shipment, events);

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error in GET /api/alerts/[shipmentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

