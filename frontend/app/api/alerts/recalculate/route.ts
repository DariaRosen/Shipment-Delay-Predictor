import { NextRequest, NextResponse } from 'next/server';
import { clearAcknowledgements } from '@/lib/test-data-store';
import { DATA_SOURCE } from '@/lib/data-source';
import { updateShipmentAlertCalculations } from '@/lib/api/update-alert-calculations';

export async function POST(request: NextRequest) {
  if (DATA_SOURCE === 'supabase') {
    try {
      const body = await request.json().catch(() => ({}));
      const { shipmentIds } = body;
      const result = await updateShipmentAlertCalculations(shipmentIds);
      return NextResponse.json({
        success: true,
        updated: result.updated,
        message: `Updated ${result.updated} shipment(s)`,
      });
    } catch (error) {
      console.error('Error in POST /api/alerts/recalculate:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  }

  clearAcknowledgements();
  return NextResponse.json({
    success: true,
    updated: 0,
    message: 'Test data regenerated on every request; acknowledgements reset.',
  });
}

