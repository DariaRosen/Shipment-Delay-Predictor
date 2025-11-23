import { NextRequest, NextResponse } from 'next/server';
import { fetchAndCalculateAlerts } from '@/lib/api/alerts-route-logic';

/**
 * This endpoint uses the EXACT same calculation logic as /api/alerts
 * by calling the same shared function. This ensures 100% consistency.
 * 
 * Both routes now use the SAME code path for fetching and calculating,
 * eliminating any possibility of mismatches.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  try {
    const { shipmentId } = await params;

    // Use SHARED logic function - EXACT same as /api/alerts route
    // This ensures both endpoints use identical data fetching and calculation
    const allAlerts = await fetchAndCalculateAlerts({ shipmentId });

    // Find the specific shipment
    const alert = allAlerts.find(a => a.shipmentId === shipmentId);

    if (!alert) {
      return NextResponse.json(
        { error: `Shipment with id ${shipmentId} was not found` },
        { status: 404 },
      );
    }

    // Return alert directly - same calculation as alerts route, no filtering
    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error in GET /api/alerts/[shipmentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

