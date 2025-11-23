import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { DelayCalculatorService, ShipmentData } from '@/lib/services/delay-calculator';
import type { AlertsResponse, AlertShipment } from '@/types/alerts';

type ShipmentStatus = 'all' | 'completed' | 'in_progress' | 'canceled' | 'future';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
    const status = (searchParams.get('status') as ShipmentStatus) || undefined;
    const search = searchParams.get('search') || undefined;

    const supabase = getSupabaseClient();
    let query = supabase.from('shipments').select('*');

    // Apply year filter
    if (year) {
      const startDate = `${year}-01-01T00:00:00Z`;
      const endDate = `${year}-12-31T23:59:59Z`;
      query = query
        .gte('order_date', startDate)
        .lte('order_date', endDate);
    }

    // Apply month filter (requires year)
    if (month && year) {
      const monthStr = String(month).padStart(2, '0');
      const startDate = `${year}-${monthStr}-01T00:00:00Z`;
      const daysInMonth = new Date(year, month, 0).getDate();
      const endDate = `${year}-${monthStr}-${daysInMonth}T23:59:59Z`;
      query = query
        .gte('order_date', startDate)
        .lte('order_date', endDate);
    }

    // Apply search filter
    if (search) {
      const term = search.toLowerCase();
      query = query.or(
        `shipment_id.ilike.%${term}%,origin_city.ilike.%${term}%,dest_city.ilike.%${term}%`,
      );
    }

    const { data: shipments, error } = await query.order('order_date', {
      ascending: false,
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

    // Fetch all events for these shipments
    const shipmentIds = shipments.map((s: any) => s.shipment_id);
    const { data: allEvents } = await supabase
      .from('shipment_events')
      .select('*')
      .in('shipment_id', shipmentIds)
      .order('event_time', { ascending: true });

    // Group events by shipment_id
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

    // Calculate alerts for each shipment
    const delayCalculator = new DelayCalculatorService();
    const alerts: AlertShipment[] = [];

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
        acknowledged: s.acknowledged,
        acknowledgedBy: s.acknowledged_by || undefined,
        acknowledgedAt: s.acknowledged_at || undefined,
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

