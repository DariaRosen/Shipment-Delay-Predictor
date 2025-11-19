export type Severity = 'High' | 'Medium' | 'Low'

export type Mode = 'Air' | 'Sea' | 'Road'

export type RiskReason =
  | 'StaleStatus'
  | 'PortCongestion'
  | 'CustomsHold'
  | 'MissedDeparture'
  | 'LongDwell'
  | 'NoPickup'
  | 'HubCongestion'
  | 'WeatherAlert'
  | 'CapacityShortage'
  | 'DocsMissing'

export interface AlertShipment {
  shipmentId: string
  origin: string
  destination: string
  mode: Mode
  carrierName: string
  serviceLevel: string
  currentStage: string
  plannedEta: string
  daysToEta: number
  lastMilestoneUpdate: string
  riskScore: number
  severity: Severity
  riskReasons: RiskReason[]
  owner: string
}

export interface AlertsResponse {
  data: AlertShipment[]
  meta: {
    lastUpdated: string
    count: number
  }
}

export interface AlertsFilters {
  severity?: Severity
  mode?: Mode
  carrier?: string
  search?: string
}

