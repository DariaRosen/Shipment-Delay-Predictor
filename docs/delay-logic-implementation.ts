/**
 * Assignment Part 4: Delay Logic Implementation
 * 
 * This file contains the isShipmentAtRisk function and example usage
 * demonstrating both "at risk" and "not at risk" scenarios.
 */

interface ShipmentData {
  shipmentId: string;
  plannedEta: string; // ISO 8601 date string
  lastMilestoneUpdate: string; // ISO 8601 date string
  currentStage: string;
  events?: Array<{
    event_time: string;
    event_stage: string;
  }>;
}

/**
 * Determines if a shipment is at risk of delay based on multiple factors
 * @param shipmentData - Shipment object with all relevant data
 * @returns true if shipment is at risk, false otherwise
 */
function isShipmentAtRisk(shipmentData: ShipmentData): boolean {
  const now = new Date();
  const expectedDelivery = new Date(shipmentData.plannedEta);
  const lastUpdate = new Date(shipmentData.lastMilestoneUpdate);
  
  // Calculate time differences
  const daysToEta = Math.ceil((expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Risk Factor 1: Stale Status - No update in 3+ days
  if (daysSinceLastUpdate > 3) {
    return true;
  }
  
  // Risk Factor 2: Missed Delivery - ETA passed but not delivered
  if (expectedDelivery < now && 
      !shipmentData.currentStage.toLowerCase().includes('delivered') &&
      !shipmentData.currentStage.toLowerCase().includes('received')) {
    return true;
  }
  
  // Risk Factor 3: Late Final Mile - ETA within 3 days but not in delivery stage
  if (daysToEta >= 0 && daysToEta <= 3 && 
      !shipmentData.currentStage.toLowerCase().includes('out for delivery') &&
      !shipmentData.currentStage.toLowerCase().includes('delivery')) {
    return true;
  }
  
  // Risk Factor 4: Long Dwell Time - Stuck in same stage
  if (shipmentData.events && shipmentData.events.length > 0) {
    const latestEvent = shipmentData.events
      .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())[0];
    
    const latestEventTime = new Date(latestEvent.event_time);
    const timeInCurrentStage = (now.getTime() - latestEventTime.getTime()) / (1000 * 60 * 60 * 24);
    
    // Check if stuck in same stage for more than 2 days
    if (timeInCurrentStage > 2 && 
        latestEvent.event_stage.toLowerCase() === shipmentData.currentStage.toLowerCase()) {
      return true;
    }
  }
  
  // Risk Factor 5: Customs Hold - Stuck in customs for more than 1 day
  if (shipmentData.currentStage.toLowerCase().includes('customs') && 
      daysSinceLastUpdate > 1) {
    return true;
  }
  
  // Risk Factor 6: Port Congestion - Stuck at port for more than 2 days
  if (shipmentData.currentStage.toLowerCase().includes('port') && 
      daysSinceLastUpdate > 2) {
    return true;
  }
  
  // If none of the risk factors are triggered, shipment is not at risk
  return false;
}

// ============================================
// Example Usage
// ============================================

// Example 1: Shipment at risk (Stale Status)
const shipment1: ShipmentData = {
  shipmentId: "LD1001",
  plannedEta: "2025-11-22T18:00:00Z",
  lastMilestoneUpdate: "2025-11-15T05:00:00Z", // 4 days ago (assuming today is Nov 19)
  currentStage: "Port Loading",
  events: [
    {
      event_time: "2025-11-15T05:00:00Z",
      event_stage: "Port Loading"
    }
  ]
};

console.log("Example 1 - Shipment LD1001:");
console.log("  Shipment ID:", shipment1.shipmentId);
console.log("  Current Stage:", shipment1.currentStage);
console.log("  Days since last update: 4");
console.log("  At risk?", isShipmentAtRisk(shipment1));
console.log("  Reason: Stale Status (no update in 4 days, exceeds 3-day threshold)");
console.log("");

// Example 2: Shipment at risk (Missed Delivery)
const shipment2: ShipmentData = {
  shipmentId: "LD1002",
  plannedEta: "2025-11-19T12:00:00Z", // ETA passed (assuming today is Nov 19+)
  lastMilestoneUpdate: "2025-11-18T04:30:00Z",
  currentStage: "Awaiting Customs", // Not delivered
  events: [
    {
      event_time: "2025-11-18T04:30:00Z",
      event_stage: "Awaiting Customs"
    }
  ]
};

console.log("Example 2 - Shipment LD1002:");
console.log("  Shipment ID:", shipment2.shipmentId);
console.log("  Current Stage:", shipment2.currentStage);
console.log("  ETA Status: Passed");
console.log("  At risk?", isShipmentAtRisk(shipment2));
console.log("  Reason: Missed Delivery (ETA passed but not delivered)");
console.log("");

// Example 3: Shipment NOT at risk (On track)
const shipment3: ShipmentData = {
  shipmentId: "LD1003",
  plannedEta: "2025-11-30T00:00:00Z", // 11 days away
  lastMilestoneUpdate: "2025-11-18T08:00:00Z", // Updated yesterday (assuming today is Nov 19)
  currentStage: "In Transit",
  events: [
    {
      event_time: "2025-11-18T08:00:00Z",
      event_stage: "In Transit"
    }
  ]
};

console.log("Example 3 - Shipment LD1003:");
console.log("  Shipment ID:", shipment3.shipmentId);
console.log("  Current Stage:", shipment3.currentStage);
console.log("  Days to ETA: 11");
console.log("  Days since last update: 1");
console.log("  At risk?", isShipmentAtRisk(shipment3));
console.log("  Reason: No risk factors triggered - shipment is on track");
console.log("");

// Example 4: Shipment at risk (Customs Hold)
const shipment4: ShipmentData = {
  shipmentId: "LD1009",
  plannedEta: "2025-11-24T00:00:00Z",
  lastMilestoneUpdate: "2025-11-18T09:00:00Z", // 1+ days ago
  currentStage: "Customs Clearance", // Contains "customs"
  events: [
    {
      event_time: "2025-11-18T09:00:00Z",
      event_stage: "Customs Clearance"
    }
  ]
};

console.log("Example 4 - Shipment LD1009:");
console.log("  Shipment ID:", shipment4.shipmentId);
console.log("  Current Stage:", shipment4.currentStage);
console.log("  Days since last update: 1+");
console.log("  At risk?", isShipmentAtRisk(shipment4));
console.log("  Reason: Customs Hold (stuck in customs for more than 1 day)");

