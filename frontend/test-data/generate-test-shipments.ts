import { RiskReason } from '@/types/alerts'

const DAY_MS = 24 * 60 * 60 * 1000

type SeverityPreset = 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal'

interface ScenarioConfig {
  severity: SeverityPreset
  count: number
  timelineDays: [number, number]
  delayDays: [number, number] // negative = days until ETA (future)
  stage: string
  mode: 'Air' | 'Sea' | 'Road'
  carrierPool: string[]
  serviceLevel: string
  owner: string
  riskReasons: RiskReason[]
}

export interface GeneratedShipmentRecord {
  shipment_id: string
  order_date: string
  expected_delivery: string
  current_status: string
  carrier: string
  mode: string
  origin_city: string
  origin_country: string
  dest_city: string
  dest_country: string
  service_level: string
  owner: string
  priority_level: string
  acknowledged: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
}

export interface GeneratedEventRecord {
  shipment_id: string
  event_time: string
  event_stage: string
  description?: string
  location?: string
}

const severityScenarios: ScenarioConfig[] = [
  {
    severity: 'Critical',
    count: 8,
    timelineDays: [3, 6],
    delayDays: [2, 4],
    stage: 'Port Loading',
    mode: 'Sea',
    carrierPool: ['OceanBlue', 'AtlanticShipping'],
    serviceLevel: 'Express',
    owner: 'ops-critical',
    riskReasons: ['PortCongestion', 'DocsMissing', 'CustomsHold', 'StaleStatus'],
  },
  {
    severity: 'High',
    count: 10,
    timelineDays: [9, 15],
    delayDays: [2, 4],
    stage: 'Hub Processing',
    mode: 'Sea',
    carrierPool: ['AtlanticShipping', 'PacificSea'],
    serviceLevel: 'Std',
    owner: 'ops-high',
    riskReasons: ['HubCongestion', 'CapacityShortage', 'WeatherAlert'],
  },
  {
    severity: 'Medium',
    count: 10,
    timelineDays: [4, 6],
    delayDays: [1, 1],
    stage: 'Ready for Dispatch',
    mode: 'Road',
    carrierPool: ['RoadFast', 'NorthDrive', 'RoadX'],
    serviceLevel: 'Priority',
    owner: 'ops-medium',
    riskReasons: ['MissedDeparture', 'NoPickup', 'StaleStatus'],
  },
  {
    severity: 'Low',
    count: 8,
    timelineDays: [10, 15],
    delayDays: [1, 1],
    stage: 'In Transit',
    mode: 'Air',
    carrierPool: ['SkyBridge', 'AeroLink'],
    serviceLevel: 'Std',
    owner: 'ops-low',
    riskReasons: ['WeatherAlert', 'Delayed'],
  },
  {
    severity: 'Minimal',
    count: 4,
    timelineDays: [8, 12],
    delayDays: [-6, -3], // future shipments
    stage: 'Order scheduled',
    mode: 'Road',
    carrierPool: ['NorthDrive'],
    serviceLevel: 'Priority',
    owner: 'ops-future',
    riskReasons: [],
  },
]

const lanes = [
  { origin_city: 'Shanghai', origin_country: 'China', dest_city: 'Los Angeles', dest_country: 'USA' },
  { origin_city: 'Berlin', origin_country: 'Germany', dest_city: 'Chicago', dest_country: 'USA' },
  { origin_city: 'Ho Chi Minh', origin_country: 'Vietnam', dest_city: 'Houston', dest_country: 'USA' },
  { origin_city: 'Mumbai', origin_country: 'India', dest_city: 'London', dest_country: 'UK' },
  { origin_city: 'Sao Paulo', origin_country: 'Brazil', dest_city: 'Miami', dest_country: 'USA' },
  { origin_city: 'Tokyo', origin_country: 'Japan', dest_city: 'Seattle', dest_country: 'USA' },
  { origin_city: 'Paris', origin_country: 'France', dest_city: 'New York', dest_country: 'USA' },
  { origin_city: 'Newark', origin_country: 'USA', dest_city: 'Toronto', dest_country: 'Canada' },
  { origin_city: 'Dallas', origin_country: 'USA', dest_city: 'Denver', dest_country: 'USA' },
  { origin_city: 'Los Angeles', origin_country: 'USA', dest_city: 'Phoenix', dest_country: 'USA' },
]

const riskReasonDescriptors: Record<
  RiskReason,
  { stage: string; description: string; minStaleDays?: number }
> = {
  PortCongestion: { stage: 'Port Loading', description: 'Terminal congestion' },
  DocsMissing: { stage: 'Awaiting Customs', description: 'Customs paperwork missing' },
  CustomsHold: { stage: 'Customs Hold', description: 'Held for customs inspection', minStaleDays: 2 },
  StaleStatus: { stage: 'In Transit', description: 'No scan in 4 days', minStaleDays: 4 },
  HubCongestion: { stage: 'Hub Processing', description: 'Distribution hub backlog', minStaleDays: 3 },
  CapacityShortage: { stage: 'Warehouse', description: 'Carrier capacity shortage' },
  WeatherAlert: { stage: 'In Transit', description: 'Severe weather warnings on route' },
  MissedDeparture: { stage: 'Ready for Dispatch', description: 'Departure window missed' },
  NoPickup: { stage: 'Awaiting Pickup', description: 'Pickup not executed' },
  LongDwell: { stage: 'Port Dwell', description: 'Container dwelling at port', minStaleDays: 5 },
  Lost: { stage: 'Refund customer', description: 'Shipment lost/canceled' },
  Delayed: { stage: 'In Transit', description: 'General delay indicator' },
}

function pickLane(index: number) {
  return lanes[index % lanes.length]
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function addEvent(
  events: GeneratedEventRecord[],
  shipment_id: string,
  time: Date,
  stage: string,
  description?: string,
  location?: string,
) {
  events.push({
    shipment_id,
    event_time: time.toISOString(),
    event_stage: stage,
    description,
    location,
  })
}

export interface GeneratedTestData {
  shipments: GeneratedShipmentRecord[]
  events: GeneratedEventRecord[]
}

export function generateTestShipments(totalCount = 40): GeneratedTestData {
  const shipments: GeneratedShipmentRecord[] = []
  const events: GeneratedEventRecord[] = []
  const now = Date.now()
  let sequence = 1

  severityScenarios.forEach((scenario) => {
    for (let i = 0; i < scenario.count; i++) {
      if (shipments.length >= totalCount) {
        break
      }

      const shipmentId = `TS${scenario.severity.charAt(0)}${String(sequence).padStart(4, '0')}`
      sequence++

      const lane = pickLane(i)
      const timelineDays = Math.round(randomBetween(scenario.timelineDays[0], scenario.timelineDays[1]))
      const delayDays = randomBetween(scenario.delayDays[0], scenario.delayDays[1])
      const orderDate = new Date(now - (timelineDays + Math.max(delayDays, 0)) * DAY_MS)
      const expectedDelivery = new Date(orderDate.getTime() + timelineDays * DAY_MS)
      const latestEventTime = new Date(expectedDelivery.getTime() - Math.min(delayDays, 0) * DAY_MS)

      const shipment: GeneratedShipmentRecord = {
        shipment_id: shipmentId,
        order_date: orderDate.toISOString(),
        expected_delivery: expectedDelivery.toISOString(),
        current_status: scenario.stage,
        carrier: scenario.carrierPool[i % scenario.carrierPool.length],
        mode: scenario.mode,
        origin_city: lane.origin_city,
        origin_country: lane.origin_country,
        dest_city: lane.dest_city,
        dest_country: lane.dest_country,
        service_level: scenario.serviceLevel,
        owner: scenario.owner,
        priority_level: scenario.severity === 'Critical' ? 'high' : 'normal',
        acknowledged: false,
        acknowledged_by: null,
        acknowledged_at: null,
      }

      shipments.push(shipment)

      // Base events
      addEvent(events, shipmentId, orderDate, 'Order has been successfully created', 'Order received', lane.origin_city)
      addEvent(events, shipmentId, new Date(orderDate.getTime() + DAY_MS), 'Departed from origin', 'Shipment departed', lane.origin_city)
      addEvent(events, shipmentId, latestEventTime, scenario.stage, `Currently at ${scenario.stage.toLowerCase()}`, lane.dest_city)

      // Apply risk reasons
      scenario.riskReasons.forEach((reason, idx) => {
        const descriptor = riskReasonDescriptors[reason]
        if (!descriptor) return

        const offsetDays = descriptor.minStaleDays ?? (idx + 1)
        const eventTime = new Date(now - offsetDays * DAY_MS)
        addEvent(events, shipmentId, eventTime, descriptor.stage, descriptor.description, lane.dest_city)
      })
    }
  })

  return { shipments, events }
}


