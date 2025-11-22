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
import { CheckCircle2, Clock } from 'lucide-react'

interface ShipmentsTableProps {
  shipments: AlertShipment[]
  onRowClick?: (shipmentId: string) => void
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
  if (!shipment.steps || shipment.steps.length === 0) return false
  const lastStep = shipment.steps[shipment.steps.length - 1]
  return (
    lastStep.stepName.toLowerCase().includes('package received by customer') ||
    lastStep.stepName.toLowerCase().includes('delivered') ||
    lastStep.stepName.toLowerCase().includes('received by customer')
  )
}

export const ShipmentsTable = ({ shipments, onRowClick }: ShipmentsTableProps) => {
  return (
    <div className="rounded-md border-teal-200 bg-white/95 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Shipment ID</TableHead>
            <TableHead>Lane</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Carrier</TableHead>
            <TableHead>Current Stage</TableHead>
            <TableHead>ETA</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Owner</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => {
            const completed = isShipmentCompleted(shipment)
            return (
              <TableRow
                key={shipment.shipmentId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick?.(shipment.shipmentId)}
              >
                <TableCell>
                  {completed ? (
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

