import { RiskReason } from '@/types/alerts'

export interface RiskFactorExplanation {
  name: string
  description: string
  icon: string
  severity: 'High' | 'Medium' | 'Low'
}

export const RISK_FACTOR_EXPLANATIONS: Record<RiskReason, RiskFactorExplanation> = {
  StaleStatus: {
    name: 'Stale Status',
    description: 'No tracking update received in the last 3+ days. This indicates potential tracking gaps or shipment stagnation. The shipment may be stuck or experiencing delays without visibility.',
    icon: '🕒',
    severity: 'High',
  },
  PortCongestion: {
    name: 'Port Congestion',
    description: 'Shipment has been at the port for more than 2 days. Port congestion occurs when ports are overcrowded with limited berth availability, causing vessels to wait before unloading. This is common during peak shipping seasons.',
    icon: '🚢',
    severity: 'Medium',
  },
  CustomsHold: {
    name: 'Customs Hold',
    description: 'Shipment has been held at customs for more than 1 day. Customs holds can occur due to documentation review, inspection requirements, or missing paperwork. International shipments are particularly susceptible to customs delays.',
    icon: '📋',
    severity: 'High',
  },
  MissedDeparture: {
    name: 'Missed Departure',
    description: 'Expected delivery date has passed, but the shipment has not been delivered. This indicates a critical delay where the shipment is behind schedule and may require immediate intervention.',
    icon: '❌',
    severity: 'High',
  },
  LongDwell: {
    name: 'Long Dwell Time',
    description: 'Shipment has been stuck in the same stage/location for more than 2 days. Extended dwell times indicate processing delays, operational inefficiencies, or bottlenecks at specific points in the supply chain.',
    icon: '⏳',
    severity: 'Medium',
  },
  NoPickup: {
    name: 'No Pickup',
    description: 'Package has been awaiting pickup for more than 1 day. This typically occurs when the recipient is unavailable, the delivery location is inaccessible, or there are issues with delivery instructions. Multiple delivery attempts may be required.',
    icon: '📦',
    severity: 'Medium',
  },
  HubCongestion: {
    name: 'Hub Congestion',
    description: 'Shipment has been stuck at a sorting center or distribution hub for more than 1 day. Hub congestion creates bottlenecks in the distribution network, preventing timely movement of packages through the system.',
    icon: '🏭',
    severity: 'Medium',
  },
  WeatherAlert: {
    name: 'Weather Alert',
    description: 'Weather-related delays detected in shipment events. Severe weather conditions (storms, hurricanes, snow) can ground flights, close ports, or block roads, causing significant delays across all transportation modes.',
    icon: '🌧️',
    severity: 'Medium',
  },
  CapacityShortage: {
    name: 'Capacity Shortage',
    description: 'Insufficient carrier capacity or warehouse space detected. This occurs when there is no available cargo space on scheduled flights/vessels/trucks, or when warehouses are at capacity, preventing timely processing or transportation.',
    icon: '📊',
    severity: 'Medium',
  },
  DocsMissing: {
    name: 'Documentation Missing',
    description: 'Missing or incomplete documentation detected (customs forms, shipping labels, etc.). Documentation issues prevent customs clearance and cause delays at borders, especially for international shipments.',
    icon: '📄',
    severity: 'High',
  },
  Lost: {
    name: 'Lost Shipment',
    description: 'Shipment has been stuck in the same stage for 30+ days AND is 14+ days past its ETA. This indicates the shipment may be lost or misplaced in the supply chain, requiring investigation and potential replacement.',
    icon: '⚠️',
    severity: 'High',
  },
}

/**
 * Get explanation for a risk factor
 */
export function getRiskFactorExplanation(reason: RiskReason): RiskFactorExplanation {
  return RISK_FACTOR_EXPLANATIONS[reason] || {
    name: reason,
    description: 'Unknown risk factor',
    icon: '⚠️',
    severity: 'Low',
  }
}

/**
 * Format risk reason for display
 */
export function formatRiskReason(reason: RiskReason): string {
  return RISK_FACTOR_EXPLANATIONS[reason]?.name || reason.replace(/([A-Z])/g, ' $1').trim()
}

