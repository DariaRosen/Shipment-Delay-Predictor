// This is a helper script to add steps to all shipments
// Run this to update sample-alerts.ts with steps for all shipments

import { sampleAlerts } from './sample-alerts';
import { generateShipmentSteps } from './shipment-steps-generator';

const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// This will be used in the migration script
export function addStepsToAlerts(alerts: typeof sampleAlerts) {
  return alerts.map((alert) => {
    if (alert.steps) return alert; // Already has steps

    const orderCreatedDaysAgo = Math.ceil(
      (new Date(alert.plannedEta).getTime() - new Date(alert.lastMilestoneUpdate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      ...alert,
      steps: generateShipmentSteps(
        alert.mode,
        daysAgo(orderCreatedDaysAgo + 3),
        new Date(alert.plannedEta),
        alert.currentStage,
      ),
    };
  });
}

