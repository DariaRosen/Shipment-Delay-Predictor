'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertShipment } from '@/types/alerts'
import { CheckCircle2, Clock, XCircle, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type SortField = 
  | 'shipmentId'
  | 'status'
  | 'lane'
  | 'mode'
  | 'carrier'
  | 'currentStage'
  | 'eta'
  | 'orderDate'
  | 'owner'

type SortOrder = 'asc' | 'desc'

interface ShipmentsTableProps {
  shipments: AlertShipment[]
  onRowClick?: (shipmentId: string) => void
  sortBy?: SortField
  sortOrder?: SortOrder
  onSort?: (field: SortField) => void
}

const getModeIcon = (mode: string) => {
  const icons: Record<string, string> = {
    Air: '✈️',
    Sea: '🚢',
    Road: '🚚',
  }
  return icons[mode] || ''
}

const isShipmentCompleted = (shipment: AlertShipment): boolean => {
  // Use status field if available
  if (shipment.status === 'completed') return true
  if (shipment.status === 'canceled') return false
  
  const completedStages = [
    'package received by customer',
    'delivered',
    'received by customer',
    'package received',
    'delivery completed',
  ]
  
  // Check current stage first (most reliable indicator)
  const currentStageLower = shipment.currentStage.toLowerCase()
  const isCompletedByCurrentStage = completedStages.some((stage) =>
    currentStageLower.includes(stage),
  )
  
  if (isCompletedByCurrentStage) {
    return true
  }
  
  // Check if the LAST step is the final delivery step and has actual completion time
  // Only the last step should indicate completion
  if (shipment.steps && shipment.steps.length > 0) {
    const lastStep = shipment.steps[shipment.steps.length - 1]
    const stepNameLower = lastStep.stepName.toLowerCase()
    const isFinalStep = completedStages.some((stage) =>
      stepNameLower.includes(stage),
    )
    
    // Only consider completed if:
    // 1. It's the last step (final step in the sequence)
    // 2. It matches a completion stage
    // 3. It has actual completion time (meaning it actually happened)
    if (isFinalStep && lastStep.actualCompletionTime) {
      // Verify the actual completion time is in the past
      const actualTime = new Date(lastStep.actualCompletionTime)
      const now = new Date()
      return actualTime <= now
    }
  }
  
  return false
}

const isShipmentCanceled = (shipment: AlertShipment): boolean => {
  // Use status field if available
  if (shipment.status === 'canceled') return true
  
  // Check current stage
  const currentStageLower = shipment.currentStage.toLowerCase()
  if (
    currentStageLower.includes('refund') ||
    currentStageLower.includes('canceled') ||
    currentStageLower.includes('lost')
  ) {
    return true
  }
  
  return false
}

const SortableHeader = ({
  field,
  label,
  sortBy,
  sortOrder,
  onSort,
}: {
  field: SortField
  label: string
  sortBy?: SortField
  sortOrder?: SortOrder
  onSort?: (field: SortField) => void
}) => {
  const isSorted = sortBy === field
  const canSort = !!onSort

  const handleClick = () => {
    if (canSort) {
      onSort(field)
    }
  }

  return (
    <TableHead
      className={cn(
        canSort && 'cursor-pointer hover:bg-muted/50 select-none',
        isSorted && 'bg-muted/30'
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {canSort && (
          <span className="inline-flex items-center">
            {isSorted ? (
              sortOrder === 'asc' ? (
                <ArrowUp className="h-4 w-4 text-teal-600" />
              ) : (
                <ArrowDown className="h-4 w-4 text-teal-600" />
              )
            ) : (
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        )}
      </div>
    </TableHead>
  )
}

export const ShipmentsTable = ({ 
  shipments, 
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
}: ShipmentsTableProps) => {
  return (
    <div className="rounded-md border-teal-200 bg-white/95 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader 
              field="status" 
              label="Status" 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader 
              field="shipmentId" 
              label="Shipment ID" 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader 
              field="lane" 
              label="Lane" 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader 
              field="mode" 
              label="Mode" 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader 
              field="carrier" 
              label="Carrier" 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader 
              field="currentStage" 
              label="Current Stage" 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader 
              field="eta" 
              label="ETA" 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader 
              field="orderDate" 
              label="Order Date" 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader 
              field="owner" 
              label="Owner" 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
            {shipments.map((shipment) => {
            // Prioritize backend status field over local determination
            const status = shipment.status
            const isFuture = status === 'future'
            const isCanceled = status === 'canceled'
            const isCompleted = status === 'completed'
            const isInProgress = status === 'in_progress'
            
            return (
              <TableRow
                key={shipment.shipmentId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick?.(shipment.shipmentId)}
              >
                <TableCell>
                  {isFuture ? (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      Future
                    </Badge>
                  ) : isCanceled ? (
                    <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1.5">
                      <XCircle className="h-3 w-3" />
                      Canceled
                    </Badge>
                  ) : isCompleted ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      In Progress
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono font-medium">{shipment.shipmentId}</TableCell>
                <TableCell>
                  {shipment.origin} → {shipment.destination}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="flex items-center gap-1.5">
                    <span>{getModeIcon(shipment.mode)}</span>
                    <span>{shipment.mode}</span>
                  </Badge>
                </TableCell>
                <TableCell>{shipment.carrierName}</TableCell>
                <TableCell>{shipment.currentStage}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{new Date(shipment.plannedEta).toLocaleDateString()}</span>
                    {shipment.daysToEta >= 0 && (
                      <span className="text-xs text-muted-foreground">
                        {shipment.daysToEta} days
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {shipment.orderDate
                    ? new Date(shipment.orderDate).toLocaleDateString()
                    : new Date(shipment.lastMilestoneUpdate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{shipment.owner}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

