import { ShipmentStep } from '../types/alert-shipment.interface';
import { Mode } from '../types/alert-shipment.interface';
import { calculateCityDistance } from '../utils/distance-calculator';

interface StepTemplate {
  name: string;
  description: string;
  expectedDurationHours: number;
}

const AIR_STEPS: StepTemplate[] = [
  { name: 'Your order has been successfully created', description: '', expectedDurationHours: 0 },
  { name: 'Your package is currently being prepared', description: '', expectedDurationHours: 2 },
  { name: 'Your order is being packed', description: '', expectedDurationHours: 1 },
  { name: 'Package ready to be shipped by warehouse', description: '', expectedDurationHours: 0.5 },
  { name: 'Package left warehouse', description: '', expectedDurationHours: 1 },
  { name: 'Package collected by carrier', description: '', expectedDurationHours: 2 },
  { name: 'Package received by sorting center of origin', description: '', expectedDurationHours: 4 },
  { name: 'Package left sorting center of origin', description: '', expectedDurationHours: 6 },
  { name: 'Your package arrived at airport. Awaiting transit', description: '', expectedDurationHours: 12 },
  { name: 'Import customs clearance started', description: '', expectedDurationHours: 24 },
  { name: 'Export customs clearance started', description: '', expectedDurationHours: 24 },
  { name: 'Export customs clearance complete', description: '', expectedDurationHours: 2 },
  { name: 'Awaiting flight', description: '', expectedDurationHours: 12 },
  { name: 'Package leaving origin country/region', description: '', expectedDurationHours: 0 },
  { name: 'Your package arrived at local airport', description: '', expectedDurationHours: 0 },
  { name: 'Arrived at customs', description: '', expectedDurationHours: 0 },
  { name: 'Your package will soon be handed over to the domestic courier company', description: '', expectedDurationHours: 24 },
  { name: 'Import customs clearance completed', description: '', expectedDurationHours: 2 },
  { name: 'Package arrived at regional carrier facility', description: '', expectedDurationHours: 6 },
  { name: 'Package arrived at pick-up point', description: '', expectedDurationHours: 4 },
  { name: 'Awaiting pickup', description: 'Your package is now available for pick up at the designated location. To ensure a smooth process, kindly take a look at the pickup instructions shared by the carrier.', expectedDurationHours: 0 },
  { name: 'Package received by customer', description: 'Your package has been successfully delivered and received by the customer.', expectedDurationHours: 0 },
];

const SEA_STEPS: StepTemplate[] = [
  { name: 'Your order has been successfully created', description: '', expectedDurationHours: 0 },
  { name: 'Your package is currently being prepared', description: '', expectedDurationHours: 4 },
  { name: 'Your order is being packed', description: '', expectedDurationHours: 2 },
  { name: 'Package ready to be shipped by warehouse', description: '', expectedDurationHours: 1 },
  { name: 'Package left warehouse', description: '', expectedDurationHours: 2 },
  { name: 'Package collected by carrier', description: '', expectedDurationHours: 4 },
  { name: 'Package received by sorting center of origin', description: '', expectedDurationHours: 8 },
  { name: 'Package left sorting center of origin', description: '', expectedDurationHours: 12 },
  { name: 'Export customs clearance started', description: '', expectedDurationHours: 48 },
  { name: 'Export customs clearance complete', description: '', expectedDurationHours: 4 },
  { name: 'Package arrived at port', description: '', expectedDurationHours: 24 },
  { name: 'Container loaded onto vessel', description: '', expectedDurationHours: 12 },
  { name: 'Vessel departed', description: '', expectedDurationHours: 0 },
  { name: 'In transit at sea', description: '', expectedDurationHours: 0 },
  { name: 'Vessel arrived at destination port', description: '', expectedDurationHours: 0 },
  { name: 'Container unloaded from vessel', description: '', expectedDurationHours: 12 },
  { name: 'Arrived at customs', description: '', expectedDurationHours: 0 },
  { name: 'Import customs clearance started', description: '', expectedDurationHours: 48 },
  { name: 'Import customs clearance completed', description: '', expectedDurationHours: 4 },
  { name: 'Package arrived at regional carrier facility', description: '', expectedDurationHours: 12 },
  { name: 'Package arrived at pick-up point', description: '', expectedDurationHours: 8 },
  { name: 'Awaiting pickup', description: 'Your package is now available for pick up at the designated location. To ensure a smooth process, kindly take a look at the pickup instructions shared by the carrier.', expectedDurationHours: 0 },
  { name: 'Package received by customer', description: 'Your package has been successfully delivered and received by the customer.', expectedDurationHours: 0 },
];

const ROAD_STEPS: StepTemplate[] = [
  { name: 'Your order has been successfully created', description: '', expectedDurationHours: 0 },
  { name: 'Your package is currently being prepared', description: '', expectedDurationHours: 2 },
  { name: 'Your order is being packed', description: '', expectedDurationHours: 1 },
  { name: 'Package ready to be shipped by warehouse', description: '', expectedDurationHours: 0.5 },
  { name: 'Package left warehouse', description: '', expectedDurationHours: 1 },
  { name: 'Package collected by carrier', description: '', expectedDurationHours: 2 },
  { name: 'Package received by sorting center of origin', description: '', expectedDurationHours: 4 },
  { name: 'Package left sorting center of origin', description: '', expectedDurationHours: 6 },
  { name: 'In transit', description: '', expectedDurationHours: 0 },
  { name: 'Crossed border', description: '', expectedDurationHours: 0 },
  { name: 'Border inspection', description: '', expectedDurationHours: 12 },
  { name: 'Package arrived at regional carrier facility', description: '', expectedDurationHours: 6 },
  { name: 'Package arrived at pick-up point', description: '', expectedDurationHours: 4 },
  { name: 'Awaiting pickup', description: 'Your package is now available for pick up at the designated location. To ensure a smooth process, kindly take a look at the pickup instructions shared by the carrier.', expectedDurationHours: 0 },
  { name: 'Package received by customer', description: 'Your package has been successfully delivered and received by the customer.', expectedDurationHours: 0 },
];

function getStepsForMode(mode: Mode): StepTemplate[] {
  switch (mode) {
    case 'Air':
      return AIR_STEPS;
    case 'Sea':
      return SEA_STEPS;
    case 'Road':
      return ROAD_STEPS;
    default:
      return AIR_STEPS;
  }
}

export function generateShipmentSteps(
  mode: Mode,
  orderCreatedAt: Date,
  plannedEta: Date,
  currentStage: string,
  originCity?: string,
  destCity?: string,
): ShipmentStep[] {
  const templates = getStepsForMode(mode);
  const steps: ShipmentStep[] = [];
  let currentTime = new Date(orderCreatedAt);
  const totalDuration = plannedEta.getTime() - orderCreatedAt.getTime();
  
  // Calculate distance if cities are provided
  let distance: number | null = null;
  if (originCity && destCity) {
    distance = calculateCityDistance(originCity, destCity);
  }
  
  // Calculate realistic transit time based on distance and mode
  let transitTimeHours = 0;
  if (distance !== null) {
    if (mode === 'Air') {
      // Air: ~800-900 km/h average speed (including ground time)
      transitTimeHours = Math.max(6, Math.ceil(distance / 800)); // Minimum 6 hours
    } else if (mode === 'Sea') {
      // Sea: ~20-25 km/h average speed
      transitTimeHours = Math.max(24, Math.ceil(distance / 22)); // Minimum 24 hours
    } else if (mode === 'Road') {
      // Road: ~60-80 km/h average speed (including stops)
      transitTimeHours = Math.max(8, Math.ceil(distance / 70)); // Minimum 8 hours
    }
  }
  
  // Adjust step templates with realistic transit times
  const adjustedTemplates = templates.map((template, index) => {
    let adjustedDuration = template.expectedDurationHours;
    
    // For transit steps, use calculated transit time based on distance
    const isTransitStep = 
      template.name.toLowerCase().includes('transit') || 
      template.name.toLowerCase().includes('at sea') ||
      (mode === 'Road' && template.name === 'In transit') ||
      (mode === 'Air' && (template.name.includes('leaving origin') || template.name.includes('arrived at local airport')));
    
    if (isTransitStep && transitTimeHours > 0) {
      adjustedDuration = transitTimeHours;
    }
    
    // Ensure minimum realistic durations for all steps
    // Processing steps should have at least some time
    if (adjustedDuration === 0 && !template.name.toLowerCase().includes('awaiting') && 
        !template.name.toLowerCase().includes('received by customer') &&
        !template.name.toLowerCase().includes('order has been successfully created')) {
      // Instant steps (like "departed", "crossed border") can be 0, but others need minimum time
      if (template.name.toLowerCase().includes('departed') || 
          template.name.toLowerCase().includes('crossed') ||
          template.name.toLowerCase().includes('leaving')) {
        adjustedDuration = 0; // These can be instant
      } else {
        adjustedDuration = 0.5; // Minimum 30 minutes for other steps
      }
    }
    
    return { ...template, expectedDurationHours: adjustedDuration };
  });
  
  const totalExpectedHours = adjustedTemplates.reduce((sum, t) => sum + t.expectedDurationHours, 0);

  // Find the index of the current stage
  const currentStageIndex = adjustedTemplates.findIndex((t) =>
    currentStage.toLowerCase().includes(t.name.toLowerCase().substring(0, 20)),
  );
  const activeStepIndex = currentStageIndex >= 0 ? currentStageIndex : Math.floor(adjustedTemplates.length * 0.7);

  let lastActualTime = orderCreatedAt.getTime(); // Track the last actual completion time

  adjustedTemplates.forEach((template, index) => {
    const isCompleted = index < activeStepIndex;
    const isInProgress = index === activeStepIndex;
    const isPending = index > activeStepIndex;

    // Get the adjusted duration for this step
    const stepDurationHours = template.expectedDurationHours;
    
    // Calculate expected completion time based on cumulative duration
    const cumulativeHours = adjustedTemplates
      .slice(0, index + 1)
      .reduce((sum, t) => sum + t.expectedDurationHours, 0);
    
    // Ensure we have a minimum total duration based on distance
    const minTotalHours = distance !== null && transitTimeHours > 0 
      ? Math.max(totalExpectedHours, transitTimeHours + 24) // At least transit time + 24 hours for processing
      : totalExpectedHours;
    
    const progressRatio = cumulativeHours / Math.max(totalExpectedHours, minTotalHours);
    const expectedCompletionTime = new Date(
      orderCreatedAt.getTime() + totalDuration * progressRatio,
    );
    
    // Ensure minimum realistic time gaps between steps
    // Convert step duration to milliseconds
    const minStepDurationMs = stepDurationHours > 0 
      ? stepDurationHours * 60 * 60 * 1000 // Convert hours to milliseconds
      : 5 * 60 * 1000; // Minimum 5 minutes for instant steps

    // Calculate actual completion time (if completed)
    let actualCompletionTime: Date | undefined;
    
    // First step (order created) always has actual time = order date
    if (index === 0) {
      actualCompletionTime = new Date(orderCreatedAt);
      lastActualTime = orderCreatedAt.getTime();
    } else if (isCompleted) {
      // Use the expected time as base, but ensure minimum time gap from previous step
      const minTimeGapMs = Math.max(
        minStepDurationMs, // At least the expected duration
        5 * 60 * 1000, // Minimum 5 minutes between steps
      );
      
      // Calculate base actual time (with small variance)
      const variance = (Math.random() - 0.5) * 0.1; // ±5% variance
      let baseActualTime = expectedCompletionTime.getTime() + totalDuration * variance * progressRatio;
      
      // Ensure minimum gap from previous step - this is critical for realistic timelines
      const minActualTime = lastActualTime + minTimeGapMs;
      if (baseActualTime < minActualTime) {
        baseActualTime = minActualTime;
      }
      
      // Don't exceed the expected time by too much (max 20% delay)
      const maxActualTime = expectedCompletionTime.getTime() + (totalDuration * 0.2 * progressRatio);
      if (baseActualTime > maxActualTime) {
        baseActualTime = Math.min(baseActualTime, maxActualTime);
      }
      
      actualCompletionTime = new Date(baseActualTime);
      lastActualTime = baseActualTime; // Update for next step
    } else if (isInProgress) {
      // In-progress step might have actual time if it's started
      if (Math.random() > 0.3) {
        // Ensure it's after the last completed step
        const now = Date.now();
        actualCompletionTime = new Date(Math.max(now, lastActualTime + (5 * 60 * 1000))); // At least 5 min after last
        lastActualTime = actualCompletionTime.getTime();
      }
    }

    steps.push({
      stepName: template.name,
      stepDescription: template.description || undefined,
      expectedCompletionTime: expectedCompletionTime.toISOString(),
      actualCompletionTime: actualCompletionTime?.toISOString(),
      stepOrder: index + 1,
      location: isCompleted || isInProgress ? 'In Transit' : undefined,
    });
  });

  return steps;
}

