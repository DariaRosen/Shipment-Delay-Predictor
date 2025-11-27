import { calculateShipmentAlert } from '@/lib/api/calculate-shipment-alert'
import type { AlertShipment, AlertsFilters, RiskFactorPoints, RiskReason } from '@/types/alerts'
import { generateTestShipments } from '@/test-data/generate-test-shipments'
import { getAcknowledgement } from '@/lib/test-data-store'
import { DATA_SOURCE } from '@/lib/data-source'
import { getSupabaseClient } from '@/lib/supabase'

const MS_IN_DAY = 24 * 60 * 60 * 1000

const riskReasonFilters: RiskReason[] = [
  'StaleStatus',
  'PortCongestion',
  'CustomsHold',
  'MissedDeparture',
  'Delayed',
  'LongDwell',
  'NoPickup',
  'HubCongestion',
  'WeatherAlert',
  'CapacityShortage',
  'DocsMissing',
  'Lost',
]

export async function fetchAndCalculateAlerts(filters?: AlertsFilters & { shipmentId?: string }) {
  const alerts =
    DATA_SOURCE === 'supabase'
      ? await fetchSupabaseAlerts(filters)
      : await fetchLocalAlerts(filters)

  return applyFinalFilters(alerts, filters)
}

async function fetchLocalAlerts(filters?: AlertsFilters & { shipmentId?: string }) {
  const { shipments, events } = generateTestShipments()
  const eventsByShipment = new Map<string, typeof events>()
  for (const event of events) {
    const list = eventsByShipment.get(event.shipment_id) ?? []
    list.push(event)
    eventsByShipment.set(event.shipment_id, list)
  }

  const filteredShipments = shipments.filter((shipment) => {
    if (filters?.shipmentId) {
      return shipment.shipment_id.toLowerCase().includes(filters.shipmentId.toLowerCase())
    }

    if (filters?.search) {
      const term = filters.search.toLowerCase()
      const searchableFields = [
        shipment.shipment_id,
        shipment.origin_city,
        shipment.dest_city,
        shipment.owner,
        shipment.current_status,
        shipment.carrier,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase())

      if (!searchableFields.some((value) => value.includes(term))) {
        return false
      }
    }

    if (filters?.origin && !shipment.origin_city.toLowerCase().includes(filters.origin.toLowerCase())) {
      return false
    }
    if (filters?.destination && !shipment.dest_city.toLowerCase().includes(filters.destination.toLowerCase())) {
      return false
    }
    if (filters?.owner && !shipment.owner.toLowerCase().includes(filters.owner.toLowerCase())) {
      return false
    }
    if (filters?.mode && shipment.mode !== filters.mode) {
      return false
    }
    if (filters?.carrier && !shipment.carrier.toLowerCase().includes(filters.carrier.toLowerCase())) {
      return false
    }
    if (filters?.serviceLevel && !shipment.service_level.toLowerCase().includes(filters.serviceLevel.toLowerCase())) {
      return false
    }

    return true
  })

  const alerts: AlertShipment[] = []

  for (const shipment of filteredShipments) {
    const eventsForShipment = eventsByShipment.get(shipment.shipment_id) || []
    const acknowledgement = getAcknowledgement(shipment.shipment_id)

    shipment.acknowledged = Boolean(acknowledgement)
    shipment.acknowledged_by = acknowledgement?.userId ?? null
    shipment.acknowledged_at = acknowledgement?.timestamp ?? null

    const calculatedAlert = calculateShipmentAlert(
      {
        ...shipment,
        events: eventsForShipment.map((event) => ({
          event_time: event.event_time,
          event_stage: event.event_stage,
          description: event.description,
          location: event.location,
        })),
      },
      eventsForShipment,
    )

    alerts.push({
      ...calculatedAlert,
      acknowledged: shipment.acknowledged,
      acknowledgedBy: shipment.acknowledged_by ?? undefined,
      acknowledgedAt: shipment.acknowledged_at ?? undefined,
    })
  }

  return alerts
}

async function fetchSupabaseAlerts(filters?: AlertsFilters & { shipmentId?: string }) {
  const supabase = getSupabaseClient()
  let query = supabase.from('shipments').select('*')

  if (filters?.shipmentId) {
    query = query.or(`shipment_id.ilike.%${filters.shipmentId}%`)
  } else {
    if (filters?.search) {
      const term = filters.search.toLowerCase()
      query = query.or(
        `shipment_id.ilike.%${term}%,origin_city.ilike.%${term}%,dest_city.ilike.%${term}%,owner.ilike.%${term}%,current_status.ilike.%${term}%`,
      )
    }
    if (filters?.origin) {
      query = query.ilike('origin_city', `%${filters.origin}%`)
    }
    if (filters?.destination) {
      query = query.ilike('dest_city', `%${filters.destination}%`)
    }
    if (filters?.owner) {
      query = query.ilike('owner', `%${filters.owner}%`)
    }
    if (filters?.mode) {
      query = query.eq('mode', filters.mode)
    }
    if (filters?.carrier) {
      query = query.ilike('carrier', `%${filters.carrier}%`)
    }
    if (filters?.serviceLevel) {
      query = query.ilike('service_level', `%${filters.serviceLevel}%`)
    }
  }

  const { data: shipments, error } = await query.order('expected_delivery', {
    ascending: true,
  })

  if (error) {
    throw new Error(`Failed to fetch shipments: ${error.message}`)
  }

  if (!shipments || shipments.length === 0) {
    return []
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

  const alerts: AlertShipment[] = []
  const needsCalculation: any[] = []

  for (const shipment of shipments) {
    const s = shipment as any
    const events = eventsByShipment.get(s.shipment_id) || []

    const calculatedAt = s.calculated_at ? new Date(s.calculated_at) : null
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const isStale = !calculatedAt || calculatedAt < oneHourAgo

    if (
      !isStale &&
      s.calculated_risk_score !== null &&
      s.calculated_severity !== null &&
      s.calculated_risk_reasons !== null
    ) {
      const alertWithSteps = calculateShipmentAlert(s, events)

      const storedPoints: RiskFactorPoints[] = Array.isArray(s.calculated_risk_factor_points)
        ? [...s.calculated_risk_factor_points]
        : []

      const shouldAddBasePoint =
        storedPoints.length === 0 &&
        typeof s.calculated_risk_score === 'number' &&
        s.calculated_risk_score > 0 &&
        s.calculated_severity &&
        s.calculated_severity !== 'Minimal'

      const normalizedPoints = shouldAddBasePoint ? [buildBaseRiskFactorPoint(s)] : storedPoints

      alerts.push({
        ...alertWithSteps,
        riskScore: s.calculated_risk_score,
        severity: s.calculated_severity,
        riskReasons: s.calculated_risk_reasons || [],
        riskFactorPoints: normalizedPoints,
        status: s.calculated_status || 'in_progress',
        currentStage: s.calculated_current_stage || s.current_status,
        daysToEta: s.calculated_days_to_eta ?? 0,
      })
    } else {
      needsCalculation.push(s)
    }
  }

  if (needsCalculation.length > 0) {
    for (const shipment of needsCalculation) {
      const s = shipment as any
      const events = eventsByShipment.get(s.shipment_id) || []
      const calculatedAlert = calculateShipmentAlert(s, events)

      await supabase
        .from('shipments')
        .update({
          calculated_risk_score: calculatedAlert.riskScore,
          calculated_severity: calculatedAlert.severity,
          calculated_risk_reasons: calculatedAlert.riskReasons,
          calculated_risk_factor_points: calculatedAlert.riskFactorPoints || [],
          calculated_status: calculatedAlert.status || 'in_progress',
          calculated_current_stage: calculatedAlert.currentStage,
          calculated_days_to_eta: calculatedAlert.daysToEta,
          calculated_at: new Date().toISOString(),
        })
        .eq('shipment_id', s.shipment_id)
        .then(({ error: updateError }) => {
          if (updateError) {
            console.error(`Failed to store calculated data for ${s.shipment_id}:`, updateError)
          }
        })

      alerts.push(calculatedAlert)
    }
  }

  return alerts
}

function applyFinalFilters(alerts: AlertShipment[], filters?: AlertsFilters & { shipmentId?: string }) {
  let filteredAlerts = alerts

  if (filters?.severity) {
    filteredAlerts = filteredAlerts.filter((alert) => alert.severity === filters.severity)
  }
  if (filters?.minRiskScore !== undefined) {
    filteredAlerts = filteredAlerts.filter((alert) => alert.riskScore >= filters.minRiskScore!)
  }
  if (filters?.maxRiskScore !== undefined) {
    filteredAlerts = filteredAlerts.filter((alert) => alert.riskScore <= filters.maxRiskScore!)
  }
  if (filters?.minDaysToEta !== undefined) {
    filteredAlerts = filteredAlerts.filter((alert) => alert.daysToEta >= filters.minDaysToEta!)
  }
  if (filters?.maxDaysToEta !== undefined) {
    filteredAlerts = filteredAlerts.filter((alert) => alert.daysToEta <= filters.maxDaysToEta!)
  }
  if (filters?.riskFactor) {
    filteredAlerts = filteredAlerts.filter((alert) => {
      const riskFactor = filters.riskFactor
      if (riskReasonFilters.includes(riskFactor as RiskReason) && alert.riskReasons.includes(riskFactor as RiskReason)) {
        return true
      }
      const factorKey = riskFactor === 'DelayInSteps' ? 'BaseScore' : riskFactor
      return (
        alert.riskFactorPoints?.some((point) => {
          const pointKey = point.factor === 'BaseScore' ? 'DelayInSteps' : point.factor
          return pointKey === factorKey
        }) ?? false
      )
    })
  }

  return filteredAlerts
}

function buildBaseRiskFactorPoint(shipment: any): RiskFactorPoints {
  const points = Number(shipment.calculated_risk_score) || 0
  const expectedDelivery = shipment.expected_delivery ? new Date(shipment.expected_delivery) : null
  const daysPastEta =
    expectedDelivery != null ? Math.max(0, Math.round((Date.now() - expectedDelivery.getTime()) / MS_IN_DAY)) : null
  const timelineDays =
    shipment.order_date && shipment.expected_delivery
      ? Math.max(
          0,
          Math.round(
            (new Date(shipment.expected_delivery).getTime() - new Date(shipment.order_date).getTime()) / MS_IN_DAY,
          ),
        )
      : null

  let description = 'Delay detected in planned shipment steps.'
  if (typeof daysPastEta === 'number' && daysPastEta > 0) {
    description = `${daysPastEta} day${daysPastEta === 1 ? '' : 's'} past the expected delivery milestone.`
  } else if (typeof shipment.calculated_days_to_eta === 'number' && shipment.calculated_days_to_eta <= 0) {
    const overdue = Math.abs(shipment.calculated_days_to_eta)
    description = `${overdue} day${overdue === 1 ? '' : 's'} past the planned timeline.`
  } else if (typeof timelineDays === 'number' && timelineDays <= 7) {
    description = `Short ${timelineDays}-day lane running behind schedule.`
  }

  return {
    factor: 'BaseScore',
    points,
    description,
  }
}


