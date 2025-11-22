'use client'

import { ShipmentStep } from '@/types/alerts'
import { CheckCircle2, Clock, AlertCircle, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ShipmentTimelineProps {
  steps: ShipmentStep[]
  plannedEta: string
  currentStage: string
}

export function ShipmentTimeline({ steps, plannedEta, currentStage }: ShipmentTimelineProps) {
  const now = new Date()
  const eta = new Date(plannedEta)

  const getStepStatus = (step: ShipmentStep, index: number): 'completed' | 'in-progress' | 'pending' | 'delayed' => {
    const hasActualTime = !!step.actualCompletionTime
    const actualTime = hasActualTime ? new Date(step.actualCompletionTime) : null
    
    // Find the last completed step
    const completedSteps = steps.filter((s, i) => {
      if (!s.actualCompletionTime) return false
      return new Date(s.actualCompletionTime) <= now
    })
    const lastCompletedIndex = completedSteps.length > 0 
      ? steps.findIndex((s) => s.actualCompletionTime && new Date(s.actualCompletionTime) === new Date(completedSteps[completedSteps.length - 1].actualCompletionTime!))
      : -1

    // If this step has actual completion time
    if (hasActualTime && actualTime) {
      // Check if it's in the future (shouldn't happen, but handle it)
      if (actualTime > now) {
        // Check if previous step is completed - this is in progress
        if (index > 0 && steps[index - 1].actualCompletionTime) {
          const prevTime = new Date(steps[index - 1].actualCompletionTime!)
          if (prevTime <= now) {
            return 'in-progress'
          }
        }
        return 'pending'
      }

      // Step is completed (actual time is in the past)
      // Check if it was delayed
      if (step.expectedCompletionTime) {
        const expectedTime = new Date(step.expectedCompletionTime)
        if (actualTime > expectedTime) {
          return 'delayed'
        }
      }
      return 'completed'
    }

    // No actual completion time - check if this should be in progress
    if (index === lastCompletedIndex + 1) {
      // This is the next step after the last completed one
      return 'in-progress'
    }

    if (index <= lastCompletedIndex) {
      // This step should have been completed but doesn't have actual time
      // This shouldn't happen, but mark as pending
      return 'pending'
    }

    // Future step
    return 'pending'
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
          const status = getStepStatus(step, index)
          const isDelayed = isStepDelayed(step)
          const delayDays = getDelayDays(step)

          return (
            <div key={index} className="relative flex items-start gap-4">
              {/* Status icon */}
              <div
                className={cn(
                  'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white',
                  status === 'completed' && 'border-green-500 bg-green-50',
                  status === 'in-progress' && 'border-teal-500 bg-teal-50',
                  status === 'delayed' && 'border-red-500 bg-red-50',
                  status === 'pending' && 'border-gray-300 bg-gray-50'
                )}
              >
                {status === 'completed' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                {status === 'in-progress' && <Clock className="h-6 w-6 text-teal-600" />}
                {status === 'delayed' && <AlertCircle className="h-6 w-6 text-red-600" />}
                {status === 'pending' && <div className="h-3 w-3 rounded-full bg-gray-300" />}
              </div>

              {/* Step content */}
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-teal-900">{step.stepName}</h3>
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
                    </div>
                    {step.stepDescription && (
                      <p className="text-sm text-muted-foreground mb-2">{step.stepDescription}</p>
                    )}
                    <div className="flex flex-col gap-1 text-sm">
                      {step.actualCompletionTime && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Completed:</span>
                          <span className="font-medium">
                            {format(new Date(step.actualCompletionTime), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                      {step.expectedCompletionTime && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Expected:</span>
                          <span className={cn(
                            'font-medium',
                            isDelayed && 'text-red-600'
                          )}>
                            {format(new Date(step.expectedCompletionTime), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                      {step.location && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-3 w-3 text-teal-600" />
                          <span className="text-muted-foreground text-xs">{step.location}</span>
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

