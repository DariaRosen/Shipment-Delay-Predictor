import { calculateShipmentAlert } from '@/lib/api/calculate-shipment-alert'
import type { AlertShipment, AlertsFilters, RiskReason } from '@/types/alerts'
import { generateTestShipments } from '@/test-data/generate-test-shipments'
import { getAcknowledgement } from '@/lib/test-data-store'

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
      if (riskReasonFilters.includes(riskFactor as RiskReason)) {
        if (alert.riskReasons.includes(riskFactor as RiskReason)) {
          return true
        }
      }
      const factorKey = riskFactor === 'DelayInSteps' ? 'BaseScore' : riskFactor
      if (
        alert.riskFactorPoints?.some((point) => {
          const pointKey = point.factor === 'BaseScore' ? 'DelayInSteps' : point.factor
          return pointKey === factorKey
        })
      ) {
        return true
      }
      return false
    })
  }

  return filteredAlerts
}

