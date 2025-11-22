import { Injectable } from '@nestjs/common';
import { RiskReason } from '../types/alert-shipment.interface';

export interface ShipmentEvent {
  event_time: string;
  event_stage: string;
  description?: string;
  location?: string;
}

export interface ShipmentData {
  shipment_id: string;
  order_date: string;
  expected_delivery: string;
  current_status: string;
  carrier: string;
  mode: string;
  origin_city: string;
  dest_city: string;
  service_level: string;
  owner: string;
  events: ShipmentEvent[];
}

export interface CalculatedAlert {
  shipmentId: string;
  origin: string;
  destination: string;
  mode: 'Air' | 'Sea' | 'Road';
  carrierName: string;
  serviceLevel: string;
  currentStage: string;
  plannedEta: string;
  daysToEta: number;
  lastMilestoneUpdate: string;
  orderDate?: string;
  riskScore: number;
  severity: 'High' | 'Medium' | 'Low';
  riskReasons: RiskReason[];
  owner: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  steps?: Array<{
    stepName: string;
    stepDescription?: string;
    expectedCompletionTime?: string;
    actualCompletionTime?: string;
    stepOrder: number;
    location?: string;
  }>;
}

@Injectable()
export class DelayCalculatorService {
  /**
   * Check if shipment is completed (has reached final delivery step)
   */
  isShipmentCompleted(shipment: ShipmentData): boolean {
    const completedStages = [
      'package received by customer',
      'delivered',
      'received by customer',
    ];
    
    return shipment.events.some((event) =>
      completedStages.some((stage) =>
        event.event_stage.toLowerCase().includes(stage),
      ),
    );
  }

  /**
   * Calculate delays and risk factors from raw shipment data and events
   */
  calculateAlert(shipment: ShipmentData): CalculatedAlert {
    const now = new Date();
    const expectedDelivery = new Date(shipment.expected_delivery);
    const orderDate = new Date(shipment.order_date);
    
    // Get latest event
    const latestEvent = shipment.events.length > 0
      ? shipment.events.sort((a, b) => 
          new Date(b.event_time).getTime() - new Date(a.event_time).getTime()
        )[0]
      : null;

    const lastEventTime = latestEvent ? new Date(latestEvent.event_time) : orderDate;
    const daysSinceLastEvent = (now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60 * 24);
    const daysToEta = Math.ceil((expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate risk reasons
    const riskReasons: RiskReason[] = [];
    
    // StaleStatus: No update in 3+ days
    if (daysSinceLastEvent > 3) {
      riskReasons.push('StaleStatus');
    }
    
    // MissedDeparture: Expected delivery passed but not delivered
    if (expectedDelivery < now && latestEvent?.event_stage.toLowerCase().includes('delivered') !== true) {
      riskReasons.push('MissedDeparture');
    }
    
    // LongDwell: Stuck in same stage for too long
    const stageDwellTime = this.calculateStageDwellTime(shipment.events, latestEvent?.event_stage);
    if (stageDwellTime > 2) {
      riskReasons.push('LongDwell');
    }
    
    // CustomsHold: Stuck in customs
    if (latestEvent?.event_stage.toLowerCase().includes('customs') && daysSinceLastEvent > 1) {
      riskReasons.push('CustomsHold');
    }
    
    // PortCongestion: Stuck at port
    if (latestEvent?.event_stage.toLowerCase().includes('port') && daysSinceLastEvent > 2) {
      riskReasons.push('PortCongestion');
    }
    
    // NoPickup: Awaiting pickup for too long
    if (latestEvent?.event_stage.toLowerCase().includes('pickup') && daysSinceLastEvent > 1) {
      riskReasons.push('NoPickup');
    }
    
    // HubCongestion: Stuck at hub
    if (latestEvent?.event_stage.toLowerCase().includes('hub') && daysSinceLastEvent > 1) {
      riskReasons.push('HubCongestion');
    }
    
    // WeatherAlert: Check for weather-related delays (if event mentions weather)
    if (latestEvent?.event_stage.toLowerCase().includes('weather') || 
        latestEvent?.description?.toLowerCase().includes('weather')) {
      riskReasons.push('WeatherAlert');
    }
    
    // CapacityShortage: Check for capacity-related issues
    if (latestEvent?.event_stage.toLowerCase().includes('capacity') ||
        latestEvent?.event_stage.toLowerCase().includes('shortage')) {
      riskReasons.push('CapacityShortage');
    }
    
    // DocsMissing: Check for documentation issues
    if (latestEvent?.event_stage.toLowerCase().includes('doc') ||
        latestEvent?.event_stage.toLowerCase().includes('document')) {
      riskReasons.push('DocsMissing');
    }
    
    // Calculate risk score (0-100)
    let riskScore = 0;
    
    // Base risk from time to ETA
    if (daysToEta < 0) {
      riskScore += 50; // Already past ETA
    } else if (daysToEta < 1) {
      riskScore += 40;
    } else if (daysToEta < 2) {
      riskScore += 25;
    } else if (daysToEta < 3) {
      riskScore += 15;
    }
    
    // Add risk from stale status
    if (daysSinceLastEvent > 5) {
      riskScore += 40;
    } else if (daysSinceLastEvent > 3) {
      riskScore += 25;
    } else if (daysSinceLastEvent > 1) {
      riskScore += 10;
    }
    
    // Add risk from each risk reason
    riskScore += riskReasons.length * 10;
    
    // Cap at 100
    riskScore = Math.min(100, riskScore);
    
    // Determine severity
    let severity: 'High' | 'Medium' | 'Low';
    if (riskScore >= 70) {
      severity = 'High';
    } else if (riskScore >= 40) {
      severity = 'Medium';
    } else {
      severity = 'Low';
    }
    
    // Convert events to steps format
    const steps = shipment.events
      .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime())
      .map((event, index) => ({
        stepName: event.event_stage,
        stepDescription: event.description,
        actualCompletionTime: event.event_time,
        stepOrder: index + 1,
        location: event.location,
      }));
    
    return {
      shipmentId: shipment.shipment_id,
      origin: shipment.origin_city,
      destination: shipment.dest_city,
      mode: shipment.mode as 'Air' | 'Sea' | 'Road',
      carrierName: shipment.carrier,
      serviceLevel: shipment.service_level,
      currentStage: latestEvent?.event_stage || shipment.current_status,
      plannedEta: shipment.expected_delivery,
      daysToEta: Math.max(0, daysToEta),
      lastMilestoneUpdate: latestEvent?.event_time || shipment.order_date,
      orderDate: shipment.order_date,
      riskScore: Math.round(riskScore),
      severity,
      riskReasons,
      owner: shipment.owner,
      acknowledged: false, // Will be set from shipments table
      steps: steps.length > 0 ? steps : undefined,
    };
  }
  
  /**
   * Calculate how long shipment has been in current stage
   */
  private calculateStageDwellTime(events: ShipmentEvent[], currentStage?: string): number {
    if (!currentStage || events.length === 0) return 0;
    
    // Find when current stage started
    const stageEvents = events
      .filter(e => e.event_stage === currentStage)
      .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());
    
    if (stageEvents.length === 0) return 0;
    
    const stageStartTime = new Date(stageEvents[0].event_time);
    const now = new Date();
    return (now.getTime() - stageStartTime.getTime()) / (1000 * 60 * 60 * 24); // days
  }
}

