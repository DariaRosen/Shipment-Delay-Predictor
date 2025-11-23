import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { DelayCalculatorService, ShipmentData } from '@/lib/services/delay-calculator';
import type { AlertShipment } from '@/types/alerts';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const supabase = getSupabaseClient();

    // Fetch shipment
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

    // Fetch events
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('event_time', { ascending: true });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
    }

    // Convert to ShipmentData format
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
      events: (events || []).map((e) => ({
        event_time: e.event_time,
        event_stage: e.event_stage,
        description: e.description || undefined,
        location: e.location || undefined,
      })),
    };

    // Calculate alert dynamically
    const delayCalculator = new DelayCalculatorService();
    const calculatedAlert = delayCalculator.calculateAlert(shipmentData);

    // Add acknowledgment info
    const alert: AlertShipment = {
      ...calculatedAlert,
      acknowledged: shipment.acknowledged,
      acknowledgedBy: shipment.acknowledged_by || undefined,
      acknowledgedAt: shipment.acknowledged_at || undefined,
    };

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error in GET /api/alerts/[shipmentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

