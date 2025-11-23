import { NextRequest, NextResponse } from 'next/server';
import { updateShipmentAlertCalculations } from '@/lib/api/update-alert-calculations';

/**
 * API endpoint to recalculate and store alert data for all shipments.
 * This can be called:
 * - Initially to populate calculated data
 * - Periodically via cron job to keep data fresh
 * - After bulk data imports
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { shipmentIds } = body;

    // Update calculations (for specific shipments or all)
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

