import { NextRequest, NextResponse } from 'next/server';
import { generateTestShipments } from '@/test-data/generate-test-shipments';
import { setAcknowledged } from '@/lib/test-data-store';
import { DATA_SOURCE } from '@/lib/data-source';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shipmentId, userId } = body;

    if (!shipmentId || !userId) {
      return NextResponse.json(
        { error: 'shipmentId and userId are required' },
        { status: 400 },
      );
    }

    if (DATA_SOURCE === 'supabase') {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('shipments')
        .update({
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('shipment_id', shipmentId)
        .select()
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: `Shipment with id ${shipmentId} was not found` },
          { status: 404 },
        );
      }

      return NextResponse.json({
        message: `Shipment ${shipmentId} acknowledged by ${userId}`,
        acknowledgedAt: data.acknowledged_at,
      });
    }

    const { shipments } = generateTestShipments();
    const exists = shipments.some((shipment) => shipment.shipment_id === shipmentId);

    if (!exists) {
      return NextResponse.json(
        { error: `Shipment with id ${shipmentId} was not found` },
        { status: 404 },
      );
    }

    setAcknowledged(shipmentId, userId);

    return NextResponse.json({
      message: `Shipment ${shipmentId} acknowledged by ${userId}`,
      acknowledgedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in POST /api/alerts/acknowledge:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

