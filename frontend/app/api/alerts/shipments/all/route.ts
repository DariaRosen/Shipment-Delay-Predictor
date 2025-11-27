import { NextRequest, NextResponse } from 'next/server';
import { DelayCalculatorService, ShipmentData } from '@/lib/services/delay-calculator';
import type { AlertsResponse, AlertShipment } from '@/types/alerts';
import { generateTestShipments } from '@/test-data/generate-test-shipments';
import { getAcknowledgement } from '@/lib/test-data-store';
import { DATA_SOURCE } from '@/lib/data-source';
import { getSupabaseClient } from '@/lib/supabase';

type ShipmentStatus = 'all' | 'completed' | 'in_progress' | 'canceled' | 'future';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
    const status = (searchParams.get('status') as ShipmentStatus) || undefined;
    const search = searchParams.get('search') || undefined;

    const response =
      DATA_SOURCE === 'supabase'
        ? await buildSupabaseResponse({ year, month, status, search })
        : await buildLocalResponse({ year, month, status, search });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/alerts/shipments/all:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

interface ShipmentsQueryParams {
  year?: number
  month?: number
  status?: ShipmentStatus
  search?: string
}

async function buildLocalResponse(params: ShipmentsQueryParams): Promise<AlertsResponse> {
  const { year, month, status, search } = params
  const { shipments, events } = generateTestShipments()
  const eventsByShipment = new Map<string, typeof events>()
  for (const event of events) {
    const list = eventsByShipment.get(event.shipment_id) ?? []
    list.push(event)
    eventsByShipment.set(event.shipment_id, list)
  }

  const filteredShipments = shipments.filter((shipment) => {
    const shipmentOrderDate = new Date(shipment.order_date)
    if (year && shipmentOrderDate.getUTCFullYear() !== year) {
      return false
    }
    if (month && year && shipmentOrderDate.getUTCMonth() + 1 !== month) {
      return false
    }
    if (search) {
      const term = search.toLowerCase()
      const searchable = [shipment.shipment_id, shipment.origin_city, shipment.dest_city].map((value) =>
        value.toLowerCase(),
      )
      if (!searchable.some((value) => value.includes(term))) {
        return false
      }
    }
    return true
  })

  const delayCalculator = new DelayCalculatorService()
  const alerts: AlertShipment[] = []

  for (const shipment of filteredShipments) {
    const eventsForShipment = eventsByShipment.get(shipment.shipment_id) || []
    const acknowledgement = getAcknowledgement(shipment.shipment_id)

    shipment.acknowledged = Boolean(acknowledgement)
    shipment.acknowledged_by = acknowledgement?.userId ?? null
    shipment.acknowledged_at = acknowledgement?.timestamp ?? null

    const calculatedAlert = delayCalculator.calculateAlert({
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
      events: eventsForShipment.map((event) => ({
        event_time: event.event_time,
        event_stage: event.event_stage,
        description: event.description,
        location: event.location,
      })),
    })

    if (!shouldIncludeByStatus(calculatedAlert.status, status)) {
      continue
    }

    alerts.push({
      ...calculatedAlert,
      acknowledged: shipment.acknowledged,
      acknowledgedBy: shipment.acknowledged_by ?? undefined,
      acknowledgedAt: shipment.acknowledged_at ?? undefined,
    })
  }

  return {
    data: alerts,
    meta: {
      lastUpdated: new Date().toISOString(),
      count: alerts.length,
    },
  }
}

async function buildSupabaseResponse(params: ShipmentsQueryParams): Promise<AlertsResponse> {
  const { year, month, status, search } = params
  const supabase = getSupabaseClient()
  let query = supabase.from('shipments').select('*')

  if (year) {
    const startDate = `${year}-01-01T00:00:00Z`
    const endDate = `${year}-12-31T23:59:59Z`
    query = query.gte('order_date', startDate).lte('order_date', endDate)
  }

  if (month && year) {
    const monthStr = String(month).padStart(2, '0')
    const startDate = `${year}-${monthStr}-01T00:00:00Z`
    const daysInMonth = new Date(year, month, 0).getDate()
    const endDate = `${year}-${monthStr}-${daysInMonth}T23:59:59Z`
    query = query.gte('order_date', startDate).lte('order_date', endDate)
  }

  if (search) {
    const term = search.toLowerCase()
    query = query.or(`shipment_id.ilike.%${term}%,origin_city.ilike.%${term}%,dest_city.ilike.%${term}%`)
  }

  const { data: shipments, error } = await query.order('order_date', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch shipments: ${error.message}`)
  }

  if (!shipments || shipments.length === 0) {
    return {
      data: [],
      meta: {
        lastUpdated: new Date().toISOString(),
        count: 0,
      },
    }
  }

  const shipmentIds = shipments.map((s: any) => s.shipment_id)
  const { data: allEvents } = await supabase
    .from('shipment_events')
    .select('*')
    .in('shipment_id', shipmentIds)
    .order('event_time', { ascending: true })

  const eventsByShipment = new Map<string, any[]>()
  ;(allEvents || []).forEach((e: any) => {
    if (!eventsByShipment.has(e.shipment_id)) {
      eventsByShipment.set(e.shipment_id, [])
    }
    eventsByShipment.get(e.shipment_id)!.push({
      event_time: e.event_time,
      event_stage: e.event_stage,
      description: e.description,
      location: e.location,
    })
  })

  const delayCalculator = new DelayCalculatorService()
  const alerts: AlertShipment[] = []

  for (const shipment of shipments) {
    const s = shipment as any
    const events = eventsByShipment.get(s.shipment_id) || []

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
    }

    const calculatedAlert = delayCalculator.calculateAlert(shipmentData)

    if (!shouldIncludeByStatus(calculatedAlert.status, status)) {
      continue
    }

    alerts.push({
      ...calculatedAlert,
      acknowledged: s.acknowledged,
      acknowledgedBy: s.acknowledged_by || undefined,
      acknowledgedAt: s.acknowledged_at || undefined,
    })
  }

  return {
    data: alerts,
    meta: {
      lastUpdated: new Date().toISOString(),
      count: alerts.length,
    },
  }
}

function shouldIncludeByStatus(alertStatus: AlertShipment['status'], requested?: ShipmentStatus) {
  if (!requested || requested === 'all') {
    return true
  }
  if (requested === 'completed') {
    return alertStatus === 'completed'
  }
  if (requested === 'in_progress') {
    return alertStatus === 'in_progress'
  }
  if (requested === 'canceled') {
    return alertStatus === 'canceled'
  }
  if (requested === 'future') {
    return alertStatus === 'future'
  }
  return true
}

