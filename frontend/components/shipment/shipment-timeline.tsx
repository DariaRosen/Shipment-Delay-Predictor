'use client'

import { ShipmentStep } from '@/types/alerts'
import { CheckCircle2, Clock, AlertCircle, MapPin, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ShipmentTimelineProps {
  steps: ShipmentStep[]
  plannedEta: string
  currentStage: string
}

export function ShipmentTimeline({ steps, plannedEta, currentStage }: ShipmentTimelineProps) {
  // Get current time - recalculate for each comparison to ensure accuracy
  const getNow = () => new Date()
  const eta = new Date(plannedEta)

  // Normalize step: if actualCompletionTime is in the future, treat it as expectedCompletionTime
  const normalizeStep = (step: ShipmentStep): ShipmentStep => {
    const nowTime = getNow().getTime()
    
    if (step.actualCompletionTime) {
      const actualTime = new Date(step.actualCompletionTime)
      const actualTimeMs = actualTime.getTime()
      
      // If actual time is in the future (with 1 minute buffer for timezone/rounding issues), 
      // it's actually an expected time, not an actual completion
      if (actualTimeMs > nowTime + 60000) { // 1 minute buffer
        // Use the actualCompletionTime as expectedCompletionTime, and keep existing expectedCompletionTime if it's later
        const normalized: ShipmentStep = {
          ...step,
          expectedCompletionTime: step.actualCompletionTime,
          actualCompletionTime: undefined,
        }
        
        // If there's already an expectedCompletionTime that's later, use that instead
        if (step.expectedCompletionTime) {
          const existingExpected = new Date(step.expectedCompletionTime).getTime()
          if (existingExpected > actualTimeMs) {
            normalized.expectedCompletionTime = step.expectedCompletionTime
          }
        }
        
        return normalized
      }
    }
    
    // If expectedCompletionTime exists but is in the past and there's no actualCompletionTime,
    // this might be a data issue, but we'll handle it in the status logic
    return step
  }

  const getStepStatus = (normalizedStep: ShipmentStep, index: number): 'completed' | 'in-progress' | 'pending' | 'delayed' | 'upcoming' => {
    const nowTime = getNow().getTime()
    const hasActualTime = !!normalizedStep.actualCompletionTime
    const actualTime = hasActualTime ? new Date(normalizedStep.actualCompletionTime!) : null
    const expectedTime = normalizedStep.expectedCompletionTime ? new Date(normalizedStep.expectedCompletionTime) : null

    // If step has actual completion time (must be in the past after normalization)
    if (hasActualTime && actualTime) {
      // Double-check: actual time should be in the past (with 1 minute buffer)
      const actualTimeMs = actualTime.getTime()
      if (actualTimeMs > nowTime + 60000) {
        // This shouldn't happen after normalization, but handle it anyway
        return 'upcoming'
      }
      
      // Actual time is in the past - step is completed
      // Check if it was delayed
      if (expectedTime && actualTime > expectedTime) {
        return 'delayed'
      }
      return 'completed'
    }

    // No actual completion time - determine status based on expected time and position
    if (expectedTime) {
      const expectedTimeMs = expectedTime.getTime()
      
      // If expected time is in the future, it's upcoming
      if (expectedTimeMs > nowTime + 60000) { // 1 minute buffer
        // Check if this is the current active stage (should be in-progress)
        const isCurrentStage = normalizedStep.stepName === currentStage || 
          currentStage.toLowerCase().includes(normalizedStep.stepName.toLowerCase().substring(0, 20))
        if (isCurrentStage) {
          return 'in-progress'
        }
        return 'upcoming'
      }
      
      // Expected time is in the past but no actual time - likely delayed
      return 'delayed'
    }

    // No actual or expected time - check if it's the current stage
    const isCurrentStage = normalizedStep.stepName === currentStage || 
      currentStage.toLowerCase().includes(normalizedStep.stepName.toLowerCase().substring(0, 20))
    if (isCurrentStage) {
      return 'in-progress'
    }

    // Default to pending for steps without timing information
    return 'pending'
  }

  const getDaysUntilExpected = (step: ShipmentStep): number | null => {
    if (!step.expectedCompletionTime) return null
    const expected = new Date(step.expectedCompletionTime)
    const diffMs = expected.getTime() - getNow().getTime()
    if (diffMs < 0) return null // Already past expected time
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  const isStepDelayed = (step: ShipmentStep): boolean => {
    if (!step.actualCompletionTime || !step.expectedCompletionTime) return false
    const actual = new Date(step.actualCompletionTime)
    const expected = new Date(step.expectedCompletionTime)
    return actual > expected
  }

  const getDelayDays = (step: ShipmentStep): number => {
    if (!step.actualCompletionTime || !step.expectedCompletionTime) return 0
    const actual = new Date(step.actualCompletionTime)
    const expected = new Date(step.expectedCompletionTime)
    const diffMs = actual.getTime() - expected.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No timeline data available for this shipment.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-teal-200" />

      <div className="space-y-6">
        {steps.map((step, index) => {
          const normalizedStep = normalizeStep(step)
          const status = getStepStatus(normalizedStep, index)
          const isDelayed = isStepDelayed(normalizedStep)
          const delayDays = getDelayDays(normalizedStep)
          const daysUntilExpected = getDaysUntilExpected(normalizedStep)
          const isUpcoming = status === 'upcoming'

          return (
            <div key={index} className="relative flex items-start gap-4">
              {/* Status icon */}
              <div
                className={cn(
                  'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white',
                  status === 'completed' && 'border-green-500 bg-green-50',
                  status === 'in-progress' && 'border-teal-500 bg-teal-50',
                  status === 'delayed' && 'border-red-500 bg-red-50',
                  status === 'upcoming' && 'border-blue-300 bg-blue-50',
                  status === 'pending' && 'border-gray-300 bg-gray-50'
                )}
              >
                {status === 'completed' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                {status === 'in-progress' && <Clock className="h-6 w-6 text-teal-600" />}
                {status === 'delayed' && <AlertCircle className="h-6 w-6 text-red-600" />}
                {status === 'upcoming' && <Circle className="h-6 w-6 text-blue-500 fill-blue-100" />}
                {status === 'pending' && <Circle className="h-6 w-6 text-gray-400" />}
              </div>

              {/* Step content */}
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        'font-semibold',
                        status === 'completed' && 'text-teal-900',
                        status === 'in-progress' && 'text-teal-700',
                        status === 'upcoming' && 'text-blue-700',
                        status === 'delayed' && 'text-red-700',
                        status === 'pending' && 'text-gray-600'
                      )}>{normalizedStep.stepName}</h3>
                      {isDelayed && (
                        <Badge variant="destructive" className="text-xs">
                          {delayDays} day{delayDays !== 1 ? 's' : ''} delay
                        </Badge>
                      )}
                      {status === 'in-progress' && (
                        <Badge variant="outline" className="border-teal-500 text-teal-700 text-xs">
                          In Progress
                        </Badge>
                      )}
                      {isUpcoming && (
                        <Badge variant="outline" className="border-blue-400 text-blue-700 text-xs">
                          Upcoming
                        </Badge>
                      )}
                      {isUpcoming && daysUntilExpected !== null && (
                        <Badge variant="outline" className="border-blue-300 text-blue-600 text-xs">
                          In {daysUntilExpected} day{daysUntilExpected !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    {normalizedStep.stepDescription && (
                      <p className="text-sm text-muted-foreground mb-2">{normalizedStep.stepDescription}</p>
                    )}
                    <div className="flex flex-col gap-1 text-sm">
                      {/* Show completed time only if step is actually completed (actual time in past) */}
                      {normalizedStep.actualCompletionTime && status === 'completed' && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Completed:</span>
                          <span className="font-medium">
                            {format(new Date(normalizedStep.actualCompletionTime), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                      {/* Show expected time for upcoming, in-progress, or delayed steps */}
                      {normalizedStep.expectedCompletionTime && (status === 'upcoming' || status === 'in-progress' || status === 'delayed' || !normalizedStep.actualCompletionTime) && (
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-muted-foreground',
                            (isUpcoming || status === 'in-progress') && 'font-medium text-blue-600'
                          )}>
                            Expected:
                          </span>
                          <span className={cn(
                            'font-medium',
                            isDelayed && 'text-red-600',
                            (isUpcoming || status === 'in-progress') && 'text-blue-700'
                          )}>
                            {format(new Date(normalizedStep.expectedCompletionTime), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                      {!normalizedStep.actualCompletionTime && !normalizedStep.expectedCompletionTime && (
                        <div className="text-xs text-muted-foreground italic">
                          Schedule to be determined
                        </div>
                      )}
                      {normalizedStep.location && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-3 w-3 text-teal-600" />
                          <span className="text-muted-foreground text-xs">{normalizedStep.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

