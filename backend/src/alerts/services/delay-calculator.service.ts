import { Injectable } from '@nestjs/common';
import { RiskReason } from '../types/alert-shipment.interface';
import { generateShipmentSteps } from '../data/shipment-steps-generator';

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
  status?: 'completed' | 'in_progress' | 'canceled';
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
      'package received',
      'delivery completed',
    ];
    
    // Check current_status first (most reliable indicator)
    if (shipment.current_status) {
      const currentStatusLower = shipment.current_status.toLowerCase();
      const isCompletedByStatus = completedStages.some((stage) =>
        currentStatusLower.includes(stage),
      );
      if (isCompletedByStatus) {
        return true;
      }
    }
    
    // Check if the LAST event matches completed stages
    // Only the last event should indicate completion
    if (shipment.events.length > 0) {
      const sortedEvents = [...shipment.events].sort(
        (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime(),
      );
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      const eventStageLower = lastEvent.event_stage.toLowerCase();
      const isCompletedByLastEvent = completedStages.some((stage) =>
        eventStageLower.includes(stage),
      );
      
      if (isCompletedByLastEvent) {
        // Verify the event time is in the past (actually happened)
        const eventTime = new Date(lastEvent.event_time);
        const now = new Date();
        return eventTime <= now;
      }
    }
    
    return false;
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
    
    // Generate all expected steps (including future ones) based on mode, order date, and ETA
    const orderDateForSteps = new Date(shipment.order_date);
    const plannedEtaForSteps = new Date(shipment.expected_delivery);
    const allExpectedSteps = generateShipmentSteps(
      shipment.mode as 'Air' | 'Sea' | 'Road',
      orderDateForSteps,
      plannedEtaForSteps,
      latestEvent?.event_stage || shipment.current_status,
    );
    
    // Create a map of actual events by stage name (for matching)
    const eventsByStage = new Map<string, ShipmentEvent[]>();
    shipment.events.forEach((event) => {
      const stageKey = event.event_stage.toLowerCase();
      if (!eventsByStage.has(stageKey)) {
        eventsByStage.set(stageKey, []);
      }
      eventsByStage.get(stageKey)!.push(event);
    });
    
    // Merge expected steps with actual events, ensuring chronological order
    // Steps are already in correct order from generateShipmentSteps (stepOrder 1, 2, 3, ...)
    let lastActualTime = orderDateForSteps.getTime();
    const steps = allExpectedSteps.map((expectedStep, index) => {
      // First step (order created) always uses order date as actual time
      if (index === 0 || expectedStep.stepOrder === 1) {
        const firstStepName = expectedStep.stepName.toLowerCase();
        if (firstStepName.includes('order has been successfully created')) {
          lastActualTime = orderDateForSteps.getTime();
          return {
            ...expectedStep,
            actualCompletionTime: orderDateForSteps.toISOString(),
          };
        }
      }
      
      // Try to find matching event(s) for this step
      // Use exact match first, then try partial matching
      const stepNameLower = expectedStep.stepName.toLowerCase();
      let matchingEvents = eventsByStage.get(stepNameLower) || [];
      
      // If no exact match, try partial matching (step name contains event stage or vice versa)
      if (matchingEvents.length === 0) {
        for (const [eventStageKey, events] of eventsByStage.entries()) {
          if (stepNameLower.includes(eventStageKey) || eventStageKey.includes(stepNameLower)) {
            matchingEvents = events;
            break;
          }
        }
      }
      
      // If we have matching events, use the latest one as actual completion time
      if (matchingEvents.length > 0) {
        const latestMatchingEvent = matchingEvents.sort(
          (a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime()
        )[0];
        
        let eventTime = new Date(latestMatchingEvent.event_time).getTime();
        
        // Ensure chronological order: event time must be after previous step's time
        // Only ensure it's not before the order date (which would be invalid)
        const orderDateMs = orderDateForSteps.getTime();
        const minTimeGap = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (eventTime < orderDateMs) {
          // If event time is before order date, use order date + minimum gap
          eventTime = orderDateMs + minTimeGap;
        }
        
        // Ensure this step happens after the previous step (chronological order)
        if (eventTime <= lastActualTime) {
          eventTime = lastActualTime + minTimeGap;
        }
        
        // Update lastActualTime to ensure next step is after this one
        lastActualTime = eventTime;
        
        return {
          stepName: expectedStep.stepName,
          stepDescription: expectedStep.stepDescription || latestMatchingEvent.description,
          expectedCompletionTime: expectedStep.expectedCompletionTime,
          actualCompletionTime: new Date(eventTime).toISOString(),
          stepOrder: expectedStep.stepOrder, // Preserve original step order
          location: latestMatchingEvent.location || expectedStep.location,
        };
      }
      
      // No matching event - use expected step as-is (for future steps)
      // But if it has an actual completion time from generation, ensure chronological order
      if (expectedStep.actualCompletionTime) {
        const actualTime = new Date(expectedStep.actualCompletionTime).getTime();
        const minTimeGap = 5 * 60 * 1000; // 5 minutes in milliseconds
        if (actualTime <= lastActualTime) {
          const adjustedTime = lastActualTime + minTimeGap;
          lastActualTime = adjustedTime;
          return {
            ...expectedStep,
            actualCompletionTime: new Date(adjustedTime).toISOString(),
          };
        }
        lastActualTime = actualTime;
      }
      
      return expectedStep;
    });
    
    // Ensure steps are sorted by stepOrder (should already be, but enforce it)
    steps.sort((a, b) => a.stepOrder - b.stepOrder);
    
    // Check if shipment is canceled (stuck >3 days)
    const isCanceled = this.isShipmentCanceled(shipment);
    let finalCurrentStage = latestEvent?.event_stage || shipment.current_status;
    let finalSteps = steps.length > 0 ? steps : allExpectedSteps;

    // If canceled, update current stage and add refund step
    if (isCanceled && !finalCurrentStage.toLowerCase().includes('refund')) {
      finalCurrentStage = 'Refund customer';
      
      // Add refund step as the last step
      const refundStep = {
        stepName: 'Refund customer',
        stepDescription: 'Shipment was lost or stuck in the same step for more than 30 days. Refund has been processed.',
        expectedCompletionTime: new Date().toISOString(),
        actualCompletionTime: new Date().toISOString(),
        stepOrder: finalSteps.length + 1,
        location: undefined,
      };
      
      finalSteps = [...finalSteps, refundStep];
    }

    return {
      shipmentId: shipment.shipment_id,
      origin: shipment.origin_city,
      destination: shipment.dest_city,
      mode: shipment.mode as 'Air' | 'Sea' | 'Road',
      carrierName: shipment.carrier,
      serviceLevel: shipment.service_level,
      currentStage: finalCurrentStage,
      plannedEta: shipment.expected_delivery,
      daysToEta: Math.max(0, daysToEta),
      lastMilestoneUpdate: latestEvent?.event_time || shipment.order_date,
      orderDate: shipment.order_date,
      riskScore: isCanceled ? 100 : Math.round(riskScore), // Max risk score for canceled
      severity: isCanceled ? 'High' : severity,
      riskReasons: isCanceled ? [...riskReasons, 'Lost'] as RiskReason[] : riskReasons,
      owner: shipment.owner,
      acknowledged: false, // Will be set from shipments table
      steps: finalSteps,
      status: isCanceled 
        ? 'canceled' 
        : (this.isShipmentCompleted(shipment) ? 'completed' : 'in_progress'),
    };
  }
  
  /**
   * Calculate how long shipment has been in the same step/stage
   * Returns the number of days since the last event that matches the current stage
   */
  private calculateStageDwellTime(events: ShipmentEvent[], currentStage?: string): number {
    if (!currentStage || events.length === 0) return 0;
    
    // Sort events by time (newest first)
    const sortedEvents = [...events].sort(
      (a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime(),
    );
    
    // Find the most recent event that matches the current stage
    // Use case-insensitive comparison and check if stage names match
    const currentStageLower = currentStage.toLowerCase();
    const matchingEvent = sortedEvents.find(e => 
      e.event_stage.toLowerCase() === currentStageLower ||
      e.event_stage.toLowerCase().includes(currentStageLower) ||
      currentStageLower.includes(e.event_stage.toLowerCase())
    );
    
    if (!matchingEvent) return 0;
    
    const stageStartTime = new Date(matchingEvent.event_time);
    const now = new Date();
    const daysSinceLastEvent = (now.getTime() - stageStartTime.getTime()) / (1000 * 60 * 60 * 24);
    
    // Check if there are any newer events that indicate the shipment moved to a different stage
    const newerEvents = sortedEvents.filter(e => 
      new Date(e.event_time).getTime() > stageStartTime.getTime() &&
      e.event_stage.toLowerCase() !== currentStageLower &&
      !e.event_stage.toLowerCase().includes(currentStageLower) &&
      !currentStageLower.includes(e.event_stage.toLowerCase())
    );
    
    // If there are newer events in different stages, the shipment is not stuck
    if (newerEvents.length > 0) {
      return 0;
    }
    
    return daysSinceLastEvent;
  }

  /**
   * Check if shipment is stuck in the same step for more than 30 days (likely lost)
   */
  isShipmentCanceled(shipment: ShipmentData): boolean {
    // Check if already marked as canceled
    if (shipment.current_status && shipment.current_status.toLowerCase().includes('canceled')) {
      return true;
    }

    // Check if last event indicates refund/canceled
    if (shipment.events.length > 0) {
      const sortedEvents = [...shipment.events].sort(
        (a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime(),
      );
      const lastEvent = sortedEvents[0];
      const lastEventStage = lastEvent.event_stage.toLowerCase();
      
      if (
        lastEventStage.includes('refund') ||
        lastEventStage.includes('canceled') ||
        lastEventStage.includes('lost')
      ) {
        return true;
      }
    }

    // Check if stuck in the same step/stage for more than 30 days
    const dwellTime = this.calculateStageDwellTime(
      shipment.events,
      shipment.current_status,
    );
    
    // If stuck in the same step for more than 30 days and not completed, consider it canceled
    if (dwellTime > 30 && !this.isShipmentCompleted(shipment)) {
      return true;
    }

    return false;
  }
}

