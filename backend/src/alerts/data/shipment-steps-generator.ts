import { ShipmentStep } from '../types/alert-shipment.interface';
import { Mode } from '../types/alert-shipment.interface';

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
): ShipmentStep[] {
  const templates = getStepsForMode(mode);
  const steps: ShipmentStep[] = [];
  let currentTime = new Date(orderCreatedAt);
  const totalDuration = plannedEta.getTime() - orderCreatedAt.getTime();
  const totalExpectedHours = templates.reduce((sum, t) => sum + t.expectedDurationHours, 0);

  // Find the index of the current stage
  const currentStageIndex = templates.findIndex((t) =>
    currentStage.toLowerCase().includes(t.name.toLowerCase().substring(0, 20)),
  );
  const activeStepIndex = currentStageIndex >= 0 ? currentStageIndex : Math.floor(templates.length * 0.7);

  templates.forEach((template, index) => {
    const isCompleted = index < activeStepIndex;
    const isInProgress = index === activeStepIndex;
    const isPending = index > activeStepIndex;

    // Calculate expected completion time
    const progressRatio = templates
      .slice(0, index + 1)
      .reduce((sum, t) => sum + t.expectedDurationHours, 0) / totalExpectedHours;
    const expectedCompletionTime = new Date(
      orderCreatedAt.getTime() + totalDuration * progressRatio,
    );

    // Calculate actual completion time (if completed)
    let actualCompletionTime: Date | undefined;
    if (isCompleted) {
      // Completed steps have actual time slightly before expected (or on time)
      const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
      actualCompletionTime = new Date(
        expectedCompletionTime.getTime() + totalDuration * variance * progressRatio,
      );
    } else if (isInProgress) {
      // In-progress step might have actual time if it's started
      if (Math.random() > 0.3) {
        actualCompletionTime = new Date(Date.now());
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

