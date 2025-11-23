import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { DelayCalculatorService, ShipmentData } from '@/lib/services/delay-calculator';
import type { AlertsResponse, AlertsFilters, AlertShipment } from '@/types/alerts';

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

    // Calculate alerts
    const delayCalculator = new DelayCalculatorService();
    const alerts: AlertShipment[] = [];
    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, Minimal: 0 };

    for (const shipment of shipments) {
      const s = shipment as any;
      const events = eventsByShipment.get(s.shipment_id) || [];

      const shipmentData: ShipmentData = {
        shipment_id: s.shipment_id,
        order_date: s.order_date,
        expected_delivery: s.expected_delivery,
        current_status: s.current_status,
        carrier: s.carrier,
        mode: s.mode,
        origin_city: s.origin_city,
        origin_country: s.origin_country,
        dest_city: s.dest_city,
        dest_country: s.dest_country,
        service_level: s.service_level,
        owner: s.owner,
        events: events.map((e) => ({
          event_time: e.event_time,
          event_stage: e.event_stage,
          description: e.description || undefined,
          location: e.location || undefined,
        })),
      };

      const calculatedAlert = delayCalculator.calculateAlert(shipmentData);

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

      alerts.push({
        ...calculatedAlert,
        acknowledged: s.acknowledged,
        acknowledgedBy: s.acknowledged_by || undefined,
        acknowledgedAt: s.acknowledged_at || undefined,
      });
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

