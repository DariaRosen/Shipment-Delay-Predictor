import { Injectable } from '@nestjs/common';

export interface StepSelectionCriteria {
  mode: 'Air' | 'Sea' | 'Road';
  originCountry?: string;
  destCountry?: string;
  originCity?: string;
  destCity?: string;
  isInternational?: boolean;
  isLongDistance?: boolean;
  serviceLevel?: string;
}

export interface StepDefinition {
  step_id: number;
  step_name: string;
  step_description: string | null;
  step_type: string;
  expected_duration_hours: number;
  is_required: boolean;
  applies_to_modes: string | null;
}

/**
 * Service to select relevant steps for a shipment based on its characteristics
 */
@Injectable()
export class StepSelectorService {
  /**
   * Select relevant steps for a shipment based on mode, distance, and other factors
   */
  selectStepsForShipment(
    allSteps: StepDefinition[],
    criteria: StepSelectionCriteria,
  ): StepDefinition[] {
    const selectedSteps: StepDefinition[] = [];
    const isInternational =
      criteria.isInternational ??
      (criteria.originCountry &&
        criteria.destCountry &&
        criteria.originCountry !== criteria.destCountry);

    // Helper to check if step applies to this mode
    const stepAppliesToMode = (step: StepDefinition): boolean => {
      if (!step.applies_to_modes) {
        return true; // Applies to all modes
      }
      const modes = step.applies_to_modes.split(',').map((m) => m.trim());
      return modes.includes(criteria.mode);
    };

    // Filter steps that apply to this shipment
    const applicableSteps = allSteps.filter((step) => {
      // Must apply to the shipment's mode
      if (!stepAppliesToMode(step)) {
        return false;
      }

      // Common steps always included
      if (step.step_type === 'Common') {
        return true;
      }

      // Mode-specific steps
      if (step.step_type === criteria.mode) {
        return true;
      }

      // Customs steps only for international shipments
      if (step.step_type === 'Customs') {
        return isInternational;
      }

      // Multi-modal steps (can be included based on route complexity)
      if (step.step_type === 'MultiModal') {
        // Include for international shipments or long distances
        return isInternational || criteria.isLongDistance;
      }

      return false;
    });

    // Sort by step type and name to ensure consistent ordering
    applicableSteps.sort((a, b) => {
      // Common steps first
      if (a.step_type === 'Common' && b.step_type !== 'Common') return -1;
      if (b.step_type === 'Common' && a.step_type !== 'Common') return 1;

      // Then mode-specific steps
      if (a.step_type === criteria.mode && b.step_type !== criteria.mode) return -1;
      if (b.step_type === criteria.mode && a.step_type !== criteria.mode) return 1;

      // Then customs
      if (a.step_type === 'Customs' && b.step_type !== 'Customs') return -1;
      if (b.step_type === 'Customs' && a.step_type !== 'Customs') return 1;

      // Finally, sort by name
      return a.step_name.localeCompare(b.step_name);
    });

    // Build the step sequence
    const stepSequence: StepDefinition[] = [];

    // 1. Always start with "order created"
    const orderCreated = applicableSteps.find((s) =>
      s.step_name.toLowerCase().includes('order has been successfully created'),
    );
    if (orderCreated) {
      stepSequence.push(orderCreated);
    }

    // 2. Common preparation steps
    const prepSteps = applicableSteps.filter(
      (s) =>
        s.step_type === 'Common' &&
        !s.step_name.toLowerCase().includes('order has been successfully created') &&
        !s.step_name.toLowerCase().includes('package received by customer') &&
        !s.step_name.toLowerCase().includes('awaiting pickup') &&
        !s.step_name.toLowerCase().includes('pick-up point'),
    );
    stepSequence.push(...prepSteps);

    // 3. Mode-specific transit steps
    const modeSteps = applicableSteps.filter((s) => s.step_type === criteria.mode);
    stepSequence.push(...modeSteps);

    // 4. Customs steps (if international)
    if (isInternational) {
      const customsSteps = applicableSteps.filter((s) => s.step_type === 'Customs');
      stepSequence.push(...customsSteps);
    }

    // 5. Multi-modal steps (if applicable)
    const multiModalSteps = applicableSteps.filter((s) => s.step_type === 'MultiModal');
    stepSequence.push(...multiModalSteps);

    // 6. Final delivery steps
    const deliverySteps = applicableSteps.filter(
      (s) =>
        s.step_type === 'Common' &&
        (s.step_name.toLowerCase().includes('pick-up point') ||
          s.step_name.toLowerCase().includes('awaiting pickup') ||
          s.step_name.toLowerCase().includes('package received by customer')),
    );
    stepSequence.push(...deliverySteps);

    // Remove duplicates (in case a step appears in multiple categories)
    const uniqueSteps = Array.from(
      new Map(stepSequence.map((step) => [step.step_id, step])).values(),
    );

    return uniqueSteps;
  }

  /**
   * Determine if shipment is long distance based on cities/countries
   */
  isLongDistance(criteria: StepSelectionCriteria): boolean {
    // Simple heuristic: different countries = long distance
    if (
      criteria.originCountry &&
      criteria.destCountry &&
      criteria.originCountry !== criteria.destCountry
    ) {
      return true;
    }

    // Could add more sophisticated logic here (e.g., distance calculation)
    return false;
  }
}

