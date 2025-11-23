import { Injectable } from '@nestjs/common';
import { RiskReason, ShipmentStep } from '../types/alert-shipment.interface';
import { generateShipmentSteps } from '../data/shipment-steps-generator';
import { calculateCityDistance } from '../utils/distance-calculator';

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
  origin_country?: string;
  dest_city: string;
  dest_country?: string;
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
  status?: 'completed' | 'in_progress' | 'canceled' | 'future';
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
    
    // Check if the LAST event matches completed stages (most reliable - actual event data)
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
        if (eventTime <= now) {
          return true; // Last event is a completion event and happened in the past
        }
      }
    }
    
    // Fallback: Check current_status (may be outdated)
    if (shipment.current_status) {
      const currentStatusLower = shipment.current_status.toLowerCase();
      const isCompletedByStatus = completedStages.some((stage) =>
        currentStatusLower.includes(stage),
      );
      if (isCompletedByStatus) {
        return true;
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
    
    // Check if order date is in the future - mark as future shipment
    if (orderDate > now) {
      // Generate expected steps for future shipments (so users can see the planned timeline)
      const orderDateForSteps = new Date(shipment.order_date);
      const plannedEtaForSteps = new Date(shipment.expected_delivery);
      const allExpectedSteps = generateShipmentSteps(
        shipment.mode as 'Air' | 'Sea' | 'Road',
        orderDateForSteps,
        plannedEtaForSteps,
        'Order scheduled', // Use appropriate initial stage for future shipments
        shipment.origin_city,
        shipment.dest_city,
      );
      
      // For future shipments, all steps are expected (no actual completion times yet)
      const futureSteps = allExpectedSteps.map((step) => ({
        ...step,
        actualCompletionTime: undefined, // No actual times for future shipments
      }));
      
      // Return alert for future shipments with generated steps
      return {
        shipmentId: shipment.shipment_id,
        origin: shipment.origin_city,
        destination: shipment.dest_city,
        mode: shipment.mode as 'Air' | 'Sea' | 'Road',
        carrierName: shipment.carrier,
        serviceLevel: shipment.service_level,
        currentStage: 'Order scheduled', // Appropriate stage for future shipments
        plannedEta: shipment.expected_delivery,
        daysToEta: Math.ceil((expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        lastMilestoneUpdate: shipment.order_date,
        orderDate: shipment.order_date,
        riskScore: 0,
        severity: 'Low',
        riskReasons: [],
        owner: shipment.owner,
        acknowledged: false,
        status: 'future',
        steps: futureSteps, // Include generated steps for timeline display
      };
    }
    
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
    
    // WeatherAlert: Check for weather-related delays (check all events)
    const hasWeatherIssue = shipment.events.some((event) => {
      const desc = (event.description || '').toLowerCase();
      const stage = event.event_stage.toLowerCase();
      return stage.includes('weather') || 
             desc.includes('weather') || 
             desc.includes('storm') || 
             desc.includes('hurricane') ||
             desc.includes('snow') ||
             desc.includes('rain');
    });
    if (hasWeatherIssue) {
      riskReasons.push('WeatherAlert');
    }
    
    // CapacityShortage: Check for capacity-related issues (check all events)
    const hasCapacityIssue = shipment.events.some((event) => {
      const desc = (event.description || '').toLowerCase();
      const stage = event.event_stage.toLowerCase();
      return stage.includes('capacity') ||
             stage.includes('shortage') ||
             desc.includes('capacity') ||
             desc.includes('shortage') ||
             desc.includes('full') ||
             desc.includes('no space');
    });
    if (hasCapacityIssue) {
      riskReasons.push('CapacityShortage');
    }
    
    // DocsMissing: Check for documentation issues (check all events)
    const hasDocIssue = shipment.events.some((event) => {
      const desc = (event.description || '').toLowerCase();
      const stage = event.event_stage.toLowerCase();
      return stage.includes('doc') ||
             stage.includes('document') ||
             stage.includes('paperwork') ||
             desc.includes('document') ||
             desc.includes('doc') ||
             desc.includes('paperwork') ||
             desc.includes('missing document');
    });
    if (hasDocIssue) {
      riskReasons.push('DocsMissing');
    }
    
    // ============================================
    // ENHANCED RISK SCORING ENGINE
    // ============================================
    let riskScore = 0;
    
    // 1. TEMPORAL RISK FACTORS
    
    // 1.1 Time to ETA Pressure (Weight: 0.25)
    // Only add points if shipment is actually close to or past ETA
    if (daysToEta < 0) {
      riskScore += 50; // Already past ETA - Critical
    } else if (daysToEta < 1) {
      riskScore += 40; // High risk - less than 1 day
    } else if (daysToEta < 2) {
      riskScore += 25; // Medium risk - less than 2 days
    } else if (daysToEta < 3) {
      riskScore += 15; // Low risk - less than 3 days
    }
    // If daysToEta >= 3, no points added (shipment has enough time)
    
    // 1.2 Stale Status (Weight: 0.20)
    // Only add points if shipment hasn't been updated recently
    if (daysSinceLastEvent > 5) {
      riskScore += 40; // High risk - no update in 5+ days
    } else if (daysSinceLastEvent > 3) {
      riskScore += 25; // Medium risk - no update in 3+ days
    } else if (daysSinceLastEvent > 1) {
      riskScore += 10; // Low risk - no update in 1+ days
    }
    // If daysSinceLastEvent <= 1, no points added (recent update)
    
    // 1.3 Long Dwell Time
    // Only add points if actually stuck (already detected as risk reason)
    // Don't double-count - the risk reason already adds 10 points
    
    // 2. ROUTE & DISTANCE RISK FACTORS
    // Only add these if there are already other risk factors (actual problems)
    // Distance and international status are potential risks, not actual delays
    
    // Use the same stageDwellTime calculation for consistency
    const actualStageDwellTimeForCheck = latestEvent 
      ? this.calculateStageDwellTime(shipment.events, latestEvent.event_stage)
      : 0;
    
    const hasActualRiskFactors = riskReasons.length > 0 || 
                                 daysToEta < 3 || 
                                 daysSinceLastEvent > 1 ||
                                 actualStageDwellTimeForCheck > 2;
    
    if (hasActualRiskFactors) {
      // 2.1 Distance-Based Risk (only if there are actual problems)
      const distance = calculateCityDistance(shipment.origin_city, shipment.dest_city);
      if (distance !== null) {
        const mode = shipment.mode.toLowerCase();
        if (mode === 'air') {
          if (distance > 12000) {
            riskScore += 3; // Very long distance (reduced from 10)
          } else if (distance > 8000) {
            riskScore += 2; // Long distance (reduced from 5)
          }
        } else if (mode === 'sea') {
          if (distance > 15000) {
            riskScore += 3; // Very long distance (reduced from 10)
          } else if (distance > 10000) {
            riskScore += 2; // Long distance (reduced from 5)
          }
        } else if (mode === 'road') {
          if (distance > 3000) {
            riskScore += 3; // Very long distance (reduced from 10)
          } else if (distance > 2000) {
            riskScore += 2; // Long distance (reduced from 5)
          }
        }
      }
      
      // 2.2 International vs Domestic Risk (only if there are actual problems)
      const isInternational = shipment.origin_country && 
                             shipment.dest_country && 
                             shipment.origin_country.toLowerCase() !== shipment.dest_country.toLowerCase();
      if (isInternational) {
        riskScore += 2; // International shipments (reduced from 5)
      }
    }
    
    // 3. LOCATION-BASED RISK FACTORS (already detected as risk reasons)
    // These are already in riskReasons array, but we add base risk points
    
    // 4. OPERATIONAL RISK FACTORS
    
    // 4.1 Check all events for operational issues (not just latest)
    shipment.events.forEach((event) => {
      const eventDesc = (event.description || '').toLowerCase();
      const eventStage = event.event_stage.toLowerCase();
      
      // Weather alerts
      if (eventDesc.includes('weather') || 
          eventDesc.includes('storm') || 
          eventDesc.includes('hurricane') ||
          eventStage.includes('weather')) {
        // Already added as risk reason, but ensure it's counted
      }
      
      // Capacity issues
      if (eventDesc.includes('capacity') || 
          eventDesc.includes('shortage') || 
          eventDesc.includes('full') ||
          eventStage.includes('capacity')) {
        // Already added as risk reason
      }
      
      // Documentation issues
      if (eventDesc.includes('document') || 
          eventDesc.includes('doc') || 
          eventDesc.includes('paperwork') ||
          eventStage.includes('document')) {
        // Already added as risk reason
      }
    });
    
    // 5. SEASONAL & CONTEXTUAL FACTORS
    // Only add these if there are already actual risk factors
    
    if (hasActualRiskFactors) {
      // 5.1 Peak Season (November, December) - only if there are problems
      const orderMonth = new Date(shipment.order_date).getMonth() + 1; // 1-12
      if (orderMonth === 11 || orderMonth === 12) {
        riskScore += 2; // Holiday season (reduced from 5, only if problems exist)
      }
      
      // 5.2 Day of Week (weekend processing limitations) - only if stuck
      const currentDayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      const requiresProcessing = latestEvent?.event_stage.toLowerCase().includes('customs') ||
                                 latestEvent?.event_stage.toLowerCase().includes('port') ||
                                 latestEvent?.event_stage.toLowerCase().includes('hub');
      const isStuck = daysSinceLastEvent > 1; // Only if actually stuck
      if ((currentDayOfWeek === 0 || currentDayOfWeek === 6) && requiresProcessing && isStuck) {
        riskScore += 2; // Weekend processing (reduced from 3, only if stuck)
      }
    }
    
    // 6. SERVICE LEVEL FACTORS
    // Only add if Express and there are actual problems
    
    if (shipment.service_level.toLowerCase() === 'express' && hasActualRiskFactors) {
      // Express shipments have tighter timelines
      // If ETA is close and shipment is not in final stages, add risk
      if (daysToEta < 2 && 
          !latestEvent?.event_stage.toLowerCase().includes('delivery') &&
          !latestEvent?.event_stage.toLowerCase().includes('pickup')) {
        riskScore += 5; // Express shipment not meeting expectations (reduced from 10)
      }
    }
    
    // 7. ADD RISK FROM EACH RISK REASON
    // Each risk reason adds 10 points (already significant indicators)
    riskScore += riskReasons.length * 10;
    
    // 8. SAFEGUARD: If shipment is clearly healthy, cap the score
    // Healthy = plenty of time (>=7 days), reasonably recent update (<=3 days), no actual risk reasons, not stuck
    // Recalculate stageDwellTime using latest event to ensure accuracy
    const actualStageDwellTime = latestEvent 
      ? this.calculateStageDwellTime(shipment.events, latestEvent.event_stage)
      : 0;
    
    // More lenient safeguard: if shipment has plenty of time and update is reasonably recent,
    // and no actual risk reasons (like customs hold, port congestion, etc.), consider it healthy
    const hasActualRiskReasons = riskReasons.some(reason => 
      reason !== 'StaleStatus' // StaleStatus alone (without other issues) shouldn't prevent healthy status
    );
    
    const isHealthy = daysToEta >= 7 && 
                      daysSinceLastEvent <= 3 && // More lenient: 3 days instead of 1
                      !hasActualRiskReasons && // No actual operational issues
                      actualStageDwellTime <= 3; // More lenient: 3 days instead of 2
    
    if (isHealthy) {
      // Even if distance/international/seasonal factors added points,
      // cap healthy shipments at a low score
      // If only stale status (no other issues), cap at 15; if no stale status, even lower
      const hasOnlyStaleStatus = riskReasons.length === 1 && riskReasons[0] === 'StaleStatus';
      const maxScore = hasOnlyStaleStatus ? 25 : 15; // Allow slightly higher if only stale status
      riskScore = Math.min(riskScore, maxScore);
    }
    
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
      shipment.origin_city,
      shipment.dest_city,
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
    let lastCompletedStepIndex = -1; // Track the index of the last completed step
    let lastExpectedTime = orderDateForSteps.getTime(); // Track expected time for future steps
    const calculatedSteps: ShipmentStep[] = []; // Store calculated steps to reference previous step's expected time
    
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
        lastCompletedStepIndex = index; // Track this as the last completed step
        // Update expected time base to actual completion time for future steps
        lastExpectedTime = eventTime;
        
        // Also adjust expected time if it's before the actual time
        let adjustedExpectedTime = expectedStep.expectedCompletionTime;
        if (adjustedExpectedTime) {
          const expectedTimeMs = new Date(adjustedExpectedTime).getTime();
          if (expectedTimeMs < eventTime) {
            // Expected time should be at or after actual time
            adjustedExpectedTime = new Date(eventTime).toISOString();
          }
        }
        
        const calculatedStep: ShipmentStep = {
          stepName: expectedStep.stepName,
          stepDescription: expectedStep.stepDescription || latestMatchingEvent.description,
          expectedCompletionTime: adjustedExpectedTime,
          actualCompletionTime: new Date(eventTime).toISOString(),
          stepOrder: expectedStep.stepOrder, // Preserve original step order
          location: latestMatchingEvent.location || expectedStep.location,
        };
        
        calculatedSteps.push(calculatedStep);
        return calculatedStep;
      }
      
      // No matching event - use expected step as-is (for future steps)
      // But adjust expected time to be after the last completed step
      const minTimeGap = 5 * 60 * 1000; // 5 minutes in milliseconds
      const expectedTime = expectedStep.expectedCompletionTime 
        ? new Date(expectedStep.expectedCompletionTime).getTime()
        : null;
      
      // If this is a future step (after a completed step), recalculate expected time
      // based on the last completed step, not the original ETA
      if (lastCompletedStepIndex >= 0 && index > lastCompletedStepIndex) {
        // Calculate expected time based on step duration from the previous step's expected time
        let stepDurationHours = this.getStepDuration(expectedStep.stepName, shipment.mode);
        
        // Special handling: if last completed step was "Arrived at customs", 
        // the next step should happen shortly after (within hours, not days)
        const lastCompletedStep = allExpectedSteps[lastCompletedStepIndex];
        const lastStepNameLower = lastCompletedStep.stepName.toLowerCase();
        const currentStepNameLower = expectedStep.stepName.toLowerCase();
        
        // Check if this is the first step after "Arrived at customs"
        if (lastStepNameLower.includes('arrived at customs') && index === lastCompletedStepIndex + 1) {
          // "Your package will soon be handed over to the domestic courier company" 
          // should happen within hours, not 24 hours
          if (currentStepNameLower.includes('your package will soon be handed over') ||
              currentStepNameLower.includes('import customs clearance started')) {
            stepDurationHours = 1; // 1 hour after arrival
          }
        }
        
        // For all future steps, calculate from the previous step's expected time
        // Get the previous step's expected time from the calculated steps array
        let previousExpectedTime = lastExpectedTime;
        
        // If we've already calculated a previous step, use its expected time
        if (calculatedSteps.length > 0) {
          const previousCalculatedStep = calculatedSteps[calculatedSteps.length - 1];
          if (previousCalculatedStep.expectedCompletionTime) {
            previousExpectedTime = new Date(previousCalculatedStep.expectedCompletionTime).getTime();
          }
        } else if (index > 0 && lastCompletedStepIndex >= 0) {
          // If no calculated steps yet, use the last completed step's actual time as base
          previousExpectedTime = lastActualTime;
        }
        
        // Calculate expected time based on the previous step's expected time
        const adjustedExpectedTime = previousExpectedTime + (stepDurationHours * 60 * 60 * 1000);
        lastExpectedTime = adjustedExpectedTime; // Update for next step
        
        const calculatedStep: ShipmentStep = {
          ...expectedStep,
          expectedCompletionTime: new Date(adjustedExpectedTime).toISOString(),
          actualCompletionTime: expectedStep.actualCompletionTime, // Keep if exists
        };
        
        calculatedSteps.push(calculatedStep);
        return calculatedStep;
      }
      
      // If expected time is before or equal to the last actual time, adjust it
      if (expectedTime && expectedTime <= lastActualTime) {
        // Calculate a realistic expected time based on step duration
        const stepDurationHours = this.getStepDuration(expectedStep.stepName, shipment.mode);
        const adjustedExpectedTime = lastExpectedTime + (stepDurationHours * 60 * 60 * 1000);
        lastExpectedTime = adjustedExpectedTime; // Update for next step
        
        return {
          ...expectedStep,
          expectedCompletionTime: new Date(adjustedExpectedTime).toISOString(),
          actualCompletionTime: expectedStep.actualCompletionTime, // Keep if exists
        };
      }
      
      // Update lastExpectedTime for steps that don't need adjustment
      if (expectedTime) {
        lastExpectedTime = expectedTime;
      }
      
      // If it has an actual completion time from generation, ensure chronological order
      if (expectedStep.actualCompletionTime) {
        const actualTime = new Date(expectedStep.actualCompletionTime).getTime();
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
    
    // Infer completion for required earlier steps when later steps are completed
    // This ensures logical consistency (e.g., if "Import customs clearance started" is completed,
    // then "Arrived at customs" must have been completed first)
    const minTimeGap = 5 * 60 * 1000; // 5 minutes
    const orderDateMs = orderDateForSteps.getTime();
    
    // Iterate forward through steps
    for (let i = 0; i < steps.length; i++) {
      const currentStep = steps[i];
      
      // If this step has an actual completion time, check if earlier steps need inference
      if (currentStep.actualCompletionTime) {
        const currentTime = new Date(currentStep.actualCompletionTime).getTime();
        
        // Work backwards from current step to fill in missing earlier steps
        let lastKnownTime = currentTime;
        for (let j = i - 1; j >= 0; j--) {
          const earlierStep = steps[j];
          if (!earlierStep.actualCompletionTime) {
            // Infer that the earlier step was completed just before the last known step
            let inferredTime = lastKnownTime - minTimeGap;
            
            // Ensure it's after the previous step (if it exists and has a time)
            if (j > 0) {
              const previousStep = steps[j - 1];
              if (previousStep.actualCompletionTime) {
                const previousTime = new Date(previousStep.actualCompletionTime).getTime();
                // Ensure inferred time is at least minTimeGap after the previous step
                if (inferredTime <= previousTime) {
                  inferredTime = previousTime + minTimeGap;
                }
              }
            }
            
            // Ensure it's not before the order date
            if (inferredTime >= orderDateMs && inferredTime < lastKnownTime) {
              earlierStep.actualCompletionTime = new Date(inferredTime).toISOString();
              lastKnownTime = inferredTime;
            } else {
              // Can't infer without violating constraints, stop inferring
              break;
            }
          } else {
            // Earlier step already has a time, use it as the new reference
            lastKnownTime = new Date(earlierStep.actualCompletionTime).getTime();
            break;
          }
        }
      }
    }
    
    // Check if shipment is canceled (stuck >3 days)
    const isCanceled = this.isShipmentCanceled(shipment);
    let finalCurrentStage = latestEvent?.event_stage || shipment.current_status;
    let finalSteps = steps.length > 0 ? steps : allExpectedSteps;

    // Check if there's a refund event in the actual events (from database)
    // Also check if status is "Canceled" - this is the primary indicator
    const refundEvent = shipment.events.find(e => 
      e.event_stage.toLowerCase().includes('refund') || 
      e.event_stage.toLowerCase().includes('refound')
    );
    
    const isCanceledStatus = shipment.current_status && 
      shipment.current_status.toLowerCase().includes('canceled');

    // Check if refund step already exists in the timeline
    const hasRefundStep = finalSteps.some(s => 
      s.stepName.toLowerCase().includes('refund') || 
      s.stepName.toLowerCase().includes('refound')
    );

    // If canceled status, refund event exists, or isCanceled is true, add refund step
    // Always add refund step for canceled shipments, even if it already exists (to ensure it's shown)
    if (isCanceledStatus || isCanceled || refundEvent) {
      finalCurrentStage = 'Refund customer';
      
      // Only add if it doesn't already exist
      if (!hasRefundStep) {
        // Calculate the maximum stepOrder to ensure refund is always last
        const maxStepOrder = finalSteps.length > 0 
          ? Math.max(...finalSteps.map(s => s.stepOrder || 0))
          : 0;
        const refundStepOrder = maxStepOrder + 1;
        
        // Use refund event if it exists, otherwise create one
        if (refundEvent) {
          // Add refund step from actual event - ensure it's after the last step
          const lastStep = finalSteps.length > 0 ? finalSteps[finalSteps.length - 1] : null;
          const lastStepTime = lastStep && lastStep.actualCompletionTime
            ? new Date(lastStep.actualCompletionTime).getTime()
            : new Date().getTime();
          
          const refundEventTime = new Date(refundEvent.event_time).getTime();
          // Ensure refund happens after the last step, but use the actual event time if it's valid
          const refundTime = refundEventTime > lastStepTime ? refundEventTime : lastStepTime + (60 * 60 * 1000); // 1 hour after last step
          
          const refundStep = {
            stepName: refundEvent.event_stage,
            stepDescription: refundEvent.description || 'Refund has been processed.',
            expectedCompletionTime: new Date(refundTime).toISOString(),
            actualCompletionTime: new Date(refundTime).toISOString(),
            stepOrder: refundStepOrder,
            location: refundEvent.location || undefined,
          };
          
          finalSteps = [...finalSteps, refundStep];
        } else {
          // Both conditions must be met for cancellation
          const dwellTime = this.calculateStageDwellTime(shipment.events, shipment.current_status);
          const now = new Date();
          const expectedDelivery = new Date(shipment.expected_delivery);
          const daysPastEta = (now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24);
          
          const cancellationReason = `Shipment was stuck in the same step for more than 30 days (${Math.floor(dwellTime)} days) and is ${Math.floor(daysPastEta)} days past the expected delivery date (14+ days delay).`;
          
          // Ensure refund happens after the last step
          const lastStep = finalSteps.length > 0 ? finalSteps[finalSteps.length - 1] : null;
          const lastStepTime = lastStep && lastStep.actualCompletionTime
            ? new Date(lastStep.actualCompletionTime).getTime()
            : new Date().getTime();
          const refundTime = lastStepTime + (60 * 60 * 1000); // 1 hour after last step
          
          // Add refund step as the last step
          const refundStep = {
            stepName: 'Refund customer',
            stepDescription: `${cancellationReason} Refund has been processed.`,
            expectedCompletionTime: new Date(refundTime).toISOString(),
            actualCompletionTime: new Date(refundTime).toISOString(),
            stepOrder: refundStepOrder,
            location: undefined,
          };
          
          finalSteps = [...finalSteps, refundStep];
        }
        
        // Ensure steps are sorted by stepOrder after adding refund step
        finalSteps.sort((a, b) => a.stepOrder - b.stepOrder);
      }
    }

    // Check if shipment is completed - check both events and generated steps
    const isCompletedByEvents = this.isShipmentCompleted(shipment);
    
    // Also check if the last step indicates completion (in case event doesn't exist)
    let isCompletedBySteps = false;
    if (finalSteps.length > 0) {
      const lastStep = finalSteps[finalSteps.length - 1];
      const completedStages = [
        'package received by customer',
        'delivered',
        'received by customer',
        'package received',
        'delivery completed',
      ];
      const lastStepNameLower = lastStep.stepName.toLowerCase();
      const isLastStepCompleted = completedStages.some((stage) =>
        lastStepNameLower.includes(stage),
      );
      
      if (isLastStepCompleted && lastStep.actualCompletionTime) {
        const actualTime = new Date(lastStep.actualCompletionTime);
        const now = new Date();
        if (actualTime <= now) {
          isCompletedBySteps = true;
        }
      }
    }
    
    const isCompleted = isCompletedByEvents || isCompletedBySteps;

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
        : (isCompleted ? 'completed' : 'in_progress'),
    };
  }
  
  /**
   * Get expected duration for a step based on mode
   */
  private getStepDuration(stepName: string, mode: string): number {
    const stepNameLower = stepName.toLowerCase();
    
    // Road steps
    if (mode.toLowerCase() === 'road') {
      if (stepNameLower.includes('border inspection')) return 12;
      if (stepNameLower.includes('regional carrier facility')) return 6;
      if (stepNameLower.includes('pick-up point')) return 4;
      if (stepNameLower.includes('awaiting pickup')) return 0;
    }
    
    // Air steps
    if (mode.toLowerCase() === 'air') {
      if (stepNameLower.includes('arrived at customs')) return 0; // Instant
      // Import customs clearance started (destination) should happen immediately after arriving at customs
      if (stepNameLower.includes('import customs clearance started')) return 0; // Instant - happens right after arrival
      // Import customs clearance completed takes time
      if (stepNameLower.includes('import customs clearance completed')) return 24; // 24 hours for air
      if (stepNameLower.includes('customs clearance')) return 24; // Other customs steps
      if (stepNameLower.includes('regional carrier facility')) return 6;
      if (stepNameLower.includes('pick-up point')) return 4;
      if (stepNameLower.includes('awaiting pickup')) return 0;
    }
    
    // Sea steps
    if (mode.toLowerCase() === 'sea') {
      if (stepNameLower.includes('arrived at customs')) return 0; // Instant
      if (stepNameLower.includes('customs clearance')) return 48;
      if (stepNameLower.includes('regional carrier facility')) return 12;
      if (stepNameLower.includes('pick-up point')) return 8;
      if (stepNameLower.includes('awaiting pickup')) return 0;
    }
    
    // Default: 2 hours for most processing steps
    return 2;
  }

  /**
   * Calculate how long shipment has been in the same step/stage
   * Returns the number of days since the first event that matches the current stage
   * (to detect if shipment is stuck in the same stage)
   */
  private calculateStageDwellTime(events: ShipmentEvent[], currentStage?: string): number {
    if (!currentStage || events.length === 0) return 0;
    
    // Sort events by time (oldest first)
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime(),
    );
    
    // Find all events that match the current stage
    const currentStageLower = currentStage.toLowerCase();
    const matchingEvents = sortedEvents.filter(e => 
      e.event_stage.toLowerCase() === currentStageLower ||
      e.event_stage.toLowerCase().includes(currentStageLower) ||
      currentStageLower.includes(e.event_stage.toLowerCase())
    );
    
    if (matchingEvents.length === 0) return 0;
    
    // Get the first (earliest) event in this stage
    const firstEventInStage = matchingEvents[0];
    const stageStartTime = new Date(firstEventInStage.event_time);
    
    // Get the latest event overall to see if shipment moved
    const latestEventOverall = sortedEvents[sortedEvents.length - 1];
    const latestEventTime = new Date(latestEventOverall.event_time);
    
    // Check if the latest event is still in the same stage
    const latestEventStageLower = latestEventOverall.event_stage.toLowerCase();
    const isStillInSameStage = 
      latestEventStageLower === currentStageLower ||
      latestEventStageLower.includes(currentStageLower) ||
      currentStageLower.includes(latestEventStageLower);
    
    // If shipment moved to a different stage, it's not stuck
    if (!isStillInSameStage) {
      return 0;
    }
    
    // Calculate dwell time from the first event in this stage to now
    const now = new Date();
    const daysSinceFirstEvent = (now.getTime() - stageStartTime.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceFirstEvent;
  }

  /**
   * Check if shipment should be canceled:
   * BOTH conditions must be true:
   * 1. Stuck in the same step for more than 30 days, AND
   * 2. 14+ days past the expected delivery date (ETA) and not completed
   */
  isShipmentCanceled(shipment: ShipmentData): boolean {
    // Don't cancel future shipments (order date in the future)
    const orderDate = new Date(shipment.order_date);
    const now = new Date();
    if (orderDate > now) {
      return false;
    }
    
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

    // Don't cancel if shipment is already completed
    if (this.isShipmentCompleted(shipment)) {
      return false;
    }

    // Get the latest event's stage (more accurate than current_status)
    let stageToCheck = shipment.current_status;
    if (shipment.events.length > 0) {
      const sortedEvents = [...shipment.events].sort(
        (a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime(),
      );
      stageToCheck = sortedEvents[0].event_stage;
    }

    // Condition 1: Check if stuck in the same step/stage for more than 30 days
    // Use the latest event's stage instead of current_status for more accurate detection
    const dwellTime = this.calculateStageDwellTime(
      shipment.events,
      stageToCheck,
    );
    
    // Condition 2: Check if 14+ days past expected delivery date (ETA)
    const expectedDelivery = new Date(shipment.expected_delivery);
    const daysPastEta = (now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24);
    
    // BOTH conditions must be true for cancellation
    if (dwellTime > 30 && daysPastEta >= 14) {
      return true;
    }

    return false;
  }
}

