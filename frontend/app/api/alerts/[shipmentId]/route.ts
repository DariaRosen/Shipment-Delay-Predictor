import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { calculateShipmentAlert } from '@/lib/api/calculate-shipment-alert';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;
    const supabase = getSupabaseClient();

    // Fetch shipment - same as /api/alerts route
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

    // Fetch events - same as /api/alerts route
    const { data: events } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('event_time', { ascending: true });

    // Use SHARED calculation function to ensure consistency with /api/alerts
    const alert = calculateShipmentAlert(shipment, events || []);

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error in GET /api/alerts/[shipmentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

