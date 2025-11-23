import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { calculateShipmentAlert } from '@/lib/api/calculate-shipment-alert';
import type { AlertsResponse, AlertsFilters } from '@/types/alerts';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters: AlertsFilters = {
      severity: searchParams.get('severity') as any,
      mode: searchParams.get('mode') as any,
      carrier: searchParams.get('carrier') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const supabase = getSupabaseClient();
    let query = supabase.from('shipments').select('*');

    // Apply filters
    if (filters.mode) {
      query = query.eq('mode', filters.mode);
    }
    if (filters.carrier) {
      query = query.ilike('carrier', `%${filters.carrier}%`);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      query = query.or(
        `shipment_id.ilike.%${term}%,origin_city.ilike.%${term}%,dest_city.ilike.%${term}%`,
      );
    }

    const { data: shipments, error } = await query.order('expected_delivery', {
      ascending: true,
    });

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch shipments: ${error.message}` },
        { status: 500 },
      );
    }

    if (!shipments || shipments.length === 0) {
      return NextResponse.json({
        data: [],
        meta: {
          lastUpdated: new Date().toISOString(),
          count: 0,
        },
      });
    }

    // Fetch events for all shipments
    const shipmentIds = shipments.map((s: any) => s.shipment_id);
    const { data: allEvents } = await supabase
      .from('shipment_events')
      .select('*')
      .in('shipment_id', shipmentIds)
      .order('event_time', { ascending: true });

    // Group events by shipment
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

    // Calculate alerts using shared function
    const alerts: AlertShipment[] = [];
    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, Minimal: 0 };

    // Use SHARED calculation function to ensure consistency with /api/alerts/[shipmentId]
    for (const shipment of shipments) {
      const s = shipment as any;
      const events = eventsByShipment.get(s.shipment_id) || [];

      // Use shared calculation function - same as detail page endpoint
      const calculatedAlert = calculateShipmentAlert(s, events);
      
      // Debug logging to verify calculation matches detail route
      if (process.env.NODE_ENV === 'development' && s.shipment_id === 'LD0091') {
        console.log(`[${s.shipment_id}] Calculated alert in alerts route:`, {
          riskScore: calculatedAlert.riskScore,
          riskReasons: calculatedAlert.riskReasons,
          riskFactorPointsCount: calculatedAlert.riskFactorPoints?.length || 0,
          riskFactorPoints: calculatedAlert.riskFactorPoints?.map(rfp => `${rfp.factor}:+${rfp.points}`).join(', ') || 'none',
        });
      }

      // Count all calculated severities (before filtering)
      severityCounts[calculatedAlert.severity]++;

      // Only include shipments that are in_progress (not completed, canceled, or future)
      // Only in-progress shipments can be at risk
      if (calculatedAlert.status !== 'in_progress') {
        continue;
      }

      // Only include shipments with risk factors (riskReasons or riskScore > 0)
      if (calculatedAlert.riskReasons.length === 0 && calculatedAlert.riskScore === 0) {
        continue;
      }

      // Apply severity filter after calculation
      if (filters.severity && calculatedAlert.severity !== filters.severity) {
        continue;
      }

      alerts.push(calculatedAlert);
    }

    // Log severity distribution for debugging
    console.log('Severity distribution (calculated):', severityCounts);
    console.log('Severity distribution (included in alerts):', {
      Critical: alerts.filter(a => a.severity === 'Critical').length,
      High: alerts.filter(a => a.severity === 'High').length,
      Medium: alerts.filter(a => a.severity === 'Medium').length,
      Low: alerts.filter(a => a.severity === 'Low').length,
      Minimal: alerts.filter(a => a.severity === 'Minimal').length,
    });

    const response: AlertsResponse = {
      data: alerts,
      meta: {
        lastUpdated: new Date().toISOString(),
        count: alerts.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

