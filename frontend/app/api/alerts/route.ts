import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
// TODO: Copy delay-calculator.service.ts from backend/src/alerts/services/ to frontend/lib/services/
// and remove @Injectable() decorator, then uncomment:
// import { DelayCalculatorService } from '@/lib/services/delay-calculator';
import type { AlertsResponse, AlertsFilters } from '@/types/alerts';

// Temporary: Simplified delay calculator (replace with full service after copying files)
class SimpleDelayCalculator {
  calculateAlert(shipmentData: any): any {
    // This is a placeholder - copy the full DelayCalculatorService from backend
    const now = new Date();
    const expectedDelivery = new Date(shipmentData.expected_delivery);
    const daysToEta = Math.ceil((expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      shipmentId: shipmentData.shipment_id,
      origin: shipmentData.origin_city,
      destination: shipmentData.dest_city,
      mode: shipmentData.mode,
      carrierName: shipmentData.carrier,
      serviceLevel: shipmentData.service_level,
      currentStage: shipmentData.current_status,
      plannedEta: shipmentData.expected_delivery,
      daysToEta,
      lastMilestoneUpdate: shipmentData.events[0]?.event_time || shipmentData.order_date,
      riskScore: 0,
      severity: 'Low' as const,
      riskReasons: [],
      owner: shipmentData.owner,
      acknowledged: false,
      status: 'in_progress' as const,
    };
  }
}

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
    // TODO: Replace with DelayCalculatorService after copying files
    const delayCalculator = new SimpleDelayCalculator();
    const alerts: any[] = [];

    for (const shipment of shipments) {
      const s = shipment as any;
      const events = eventsByShipment.get(s.shipment_id) || [];

      const shipmentData = {
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

      // Only include in-progress shipments with risk
      if (calculatedAlert.status !== 'in_progress') continue;
      if (calculatedAlert.riskReasons.length === 0 && calculatedAlert.riskScore === 0) continue;

      // Apply severity filter
      if (filters.severity && calculatedAlert.severity !== filters.severity) continue;

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
    console.error('Error in GET /api/alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

