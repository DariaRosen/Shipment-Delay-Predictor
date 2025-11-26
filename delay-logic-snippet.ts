/**
 * Delay Logic Implementation - Simple Function
 * 
 * This function determines if a shipment is at risk of delay based on:
 * - Actual delays (past ETA)
 * - Stale status updates
 * - Early warning signs (nearing ETA but in early stage)
 * - Operational delays (customs, port, hub, pickup)
 * - External factors (weather, capacity, documentation)
 */

interface ShipmentEvent {
  event_time: string;
  event_stage: string;
  description?: string;
}

interface ShipmentData {
  shipment_id: string;
  order_date: string;
  expected_delivery: string;
  current_status: string;
  events: ShipmentEvent[];
}

/**
 * Check if shipment is at risk of delay
 * @param shipment - Shipment data object
 * @returns true if shipment is at risk, false otherwise
 */
function isShipmentAtRisk(shipment: ShipmentData): boolean {
  const now = new Date();
  const expectedDelivery = new Date(shipment.expected_delivery);
  const orderDate = new Date(shipment.order_date);
  
  // Helper: Calculate days since a date
  const daysSince = (date: Date): number => {
    return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  };
  
  // Helper: Calculate days until a date
  const daysUntil = (date: Date): number => {
    return (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  };
  
  // Get latest event
  const latestEvent = shipment.events.length > 0
    ? shipment.events.sort((a, b) => 
        new Date(b.event_time).getTime() - new Date(a.event_time).getTime()
      )[0]
    : null;
  
  const lastEventTime = latestEvent ? new Date(latestEvent.event_time) : orderDate;
  const daysSinceLastEvent = daysSince(lastEventTime);
  const daysToEta = daysUntil(expectedDelivery);
  const daysPastEta = daysSince(expectedDelivery);
  
  const currentStage = (latestEvent?.event_stage || shipment.current_status).toLowerCase();
  
  // ============================================
  // Rule 0: Completed shipments are never at risk
  // ============================================
  const completedStages = [
    'delivered',
    'package received by customer',
    'received by customer',
    'package received',
    'delivery completed'
  ];
  
  if (completedStages.some(stage => currentStage.includes(stage))) {
    return false; // Already delivered - not at risk
  }
  
  // ============================================
  // Rule 1: Actual Delay - Past ETA = Always At Risk
  // ============================================
  if (daysPastEta > 0) {
    return true;
  }
  
  // ============================================
  // Rule 2: Stale Status - No update in 3+ days
  // ============================================
  const stale = daysSinceLastEvent > 3;
  
  // ============================================
  // Rule 3: Early Warning - Nearing ETA but still in early stage
  // ============================================
  const nearing = daysToEta <= 3; // Within 3 days of ETA
  const isEarlyStage = 
    currentStage.includes('warehouse') ||
    currentStage.includes('prepared') ||
    currentStage.includes('packed') ||
    currentStage.includes('collected') ||
    currentStage.includes('ready for dispatch');
  
  if (stale && nearing) {
    return true; // Stale status + close to ETA
  }
  
  if (nearing && isEarlyStage) {
    return true; // Close to ETA but still in early stage (MissedDeparture risk)
  }
  
  // ============================================
  // Rule 4: Operational Delays
  // ============================================
  // Customs hold: stuck in customs > 1 day
  if (currentStage.includes('customs') && daysSinceLastEvent > 1) {
    return true;
  }
  
  // Port congestion: stuck at port > 2 days
  if (currentStage.includes('port') && daysSinceLastEvent > 2) {
    return true;
  }
  
  // Hub congestion: stuck at hub > 1 day
  if (currentStage.includes('hub') && daysSinceLastEvent > 1) {
    return true;
  }
  
  // No pickup: awaiting pickup > 1 day
  if (currentStage.includes('pickup') && daysSinceLastEvent > 1) {
    return true;
  }
  
  // ============================================
  // Rule 5: External Factors
  // ============================================
  // Weather alert
  const hasWeatherIssue = shipment.events.some((event) => {
    const desc = (event.description || '').toLowerCase();
    const stage = event.event_stage.toLowerCase();
    return stage.includes('weather') || 
           desc.includes('weather') || 
           desc.includes('storm') || 
           desc.includes('hurricane');
  });
  
  if (hasWeatherIssue) {
    return true;
  }
  
  // Capacity shortage
  const hasCapacityIssue = shipment.events.some((event) => {
    const desc = (event.description || '').toLowerCase();
    return desc.includes('capacity') ||
           desc.includes('shortage') ||
           desc.includes('full');
  });
  
  if (hasCapacityIssue) {
    return true;
  }
  
  // Missing documentation
  const hasDocIssue = shipment.events.some((event) => {
    const desc = (event.description || '').toLowerCase();
    return desc.includes('document') ||
           desc.includes('paperwork') ||
           desc.includes('missing document');
  });
  
  if (hasDocIssue) {
    return true;
  }
  
  // ============================================
  // Not at risk
  // ============================================
  return false;
}

// ============================================
// Example Usage
// ============================================

// Example 1: Shipment at risk - Past ETA
const shipment1: ShipmentData = {
  shipment_id: 'LD1001',
  order_date: '2025-11-10T00:00:00Z',
  expected_delivery: '2025-11-20T18:00:00Z', // 5 days ago
  current_status: 'In Transit',
  events: [
    {
      event_time: '2025-11-15T05:00:00Z',
      event_stage: 'Port Loading',
      description: 'Shipment loaded at port'
    }
  ]
};

// Example 2: Shipment at risk - Stale status + nearing ETA
const shipment2: ShipmentData = {
  shipment_id: 'LD1002',
  order_date: '2025-11-15T00:00:00Z',
  expected_delivery: '2025-11-25T12:00:00Z', // Tomorrow
  current_status: 'Awaiting Customs',
  events: [
    {
      event_time: '2025-11-18T04:30:00Z', // 7 days ago (stale)
      event_stage: 'Awaiting Customs',
      description: 'Customs clearance in progress'
    }
  ]
};

// Example 3: Shipment at risk - Close to ETA but in early stage
const shipment3: ShipmentData = {
  shipment_id: 'LD1004',
  order_date: '2025-11-17T00:00:00Z',
  expected_delivery: '2025-11-24T20:00:00Z', // 2 days away
  current_status: 'Ready for Dispatch', // Still in early stage
  events: [
    {
      event_time: '2025-11-22T22:00:00Z', // Recent update
      event_stage: 'Ready for Dispatch',
      description: 'Shipment prepared and ready'
    }
  ]
};

// Example 4: Shipment at risk - Customs hold
const shipment4: ShipmentData = {
  shipment_id: 'LD1005',
  order_date: '2025-11-12T00:00:00Z',
  expected_delivery: '2025-11-26T06:00:00Z', // 5 days away
  current_status: 'Awaiting Customs',
  events: [
    {
      event_time: '2025-11-20T10:00:00Z', // 5 days ago (stuck >1 day)
      event_stage: 'Awaiting Customs',
      description: 'Customs inspection required'
    }
  ]
};

// Example 5: Shipment NOT at risk - Healthy shipment
const shipment5: ShipmentData = {
  shipment_id: 'LD1006',
  order_date: '2025-11-18T00:00:00Z',
  expected_delivery: '2025-11-30T00:00:00Z', // 11 days away
  current_status: 'In Transit',
  events: [
    {
      event_time: '2025-11-22T08:00:00Z', // Recent update (1 day ago)
      event_stage: 'In Transit',
      description: 'Shipment on route to destination'
    }
  ]
};

// Example 6: Shipment NOT at risk - Completed shipment
const shipment6: ShipmentData = {
  shipment_id: 'LD1007',
  order_date: '2025-11-05T00:00:00Z',
  expected_delivery: '2025-11-15T12:00:00Z',
  current_status: 'Delivered',
  events: [
    {
      event_time: '2025-11-15T14:30:00Z',
      event_stage: 'Package received by customer',
      description: 'Delivered successfully'
    }
  ]
};

// ============================================
// Test the function
// ============================================

console.log('=== Shipment Risk Assessment ===\n');

console.log(`Shipment ${shipment1.shipment_id}: ${isShipmentAtRisk(shipment1) ? '⚠️ AT RISK' : '✅ Not at risk'}`);
console.log('Reason: Past ETA (5 days delayed)\n');

console.log(`Shipment ${shipment2.shipment_id}: ${isShipmentAtRisk(shipment2) ? '⚠️ AT RISK' : '✅ Not at risk'}`);
console.log('Reason: Stale status (7 days old) + nearing ETA (1 day away)\n');

console.log(`Shipment ${shipment3.shipment_id}: ${isShipmentAtRisk(shipment3) ? '⚠️ AT RISK' : '✅ Not at risk'}`);
console.log('Reason: Close to ETA (2 days) but still in early stage (Ready for Dispatch)\n');

console.log(`Shipment ${shipment4.shipment_id}: ${isShipmentAtRisk(shipment4) ? '⚠️ AT RISK' : '✅ Not at risk'}`);
console.log('Reason: Stuck in customs > 1 day (5 days stuck)\n');

console.log(`Shipment ${shipment5.shipment_id}: ${isShipmentAtRisk(shipment5) ? '⚠️ AT RISK' : '✅ Not at risk'}`);
console.log('Reason: Healthy - recent updates, plenty of time to ETA\n');

console.log(`Shipment ${shipment6.shipment_id}: ${isShipmentAtRisk(shipment6) ? '⚠️ AT RISK' : '✅ Not at risk'}`);
console.log('Reason: Already delivered\n');

