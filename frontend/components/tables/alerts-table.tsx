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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AlertShipment, Severity, RiskReason } from '@/types/alerts'
import { getRiskFactorExplanation, formatRiskReason } from '@/lib/risk-factor-explanations'

interface AlertsTableProps {
  alerts: AlertShipment[]
  onRowClick?: (shipmentId: string) => void
}

const severityColors: Record<Severity, string> = {
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-orange-100 text-orange-800 border-orange-200',
  Low: 'bg-green-100 text-green-800 border-green-200',
}

const getModeIcon = (mode: string) => {
  const icons: Record<string, string> = {
    Air: '✈️',
    Sea: '🚢',
    Road: '🚚',
  }
  return icons[mode] || ''
}

const getRiskIcon = (reason: RiskReason) => {
  const explanation = getRiskFactorExplanation(reason)
  return explanation.icon
}

export const AlertsTable = ({ alerts, onRowClick }: AlertsTableProps) => {
  return (
    <div className="rounded-md border-teal-200 bg-white/95 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Risk Score</TableHead>
            <TableHead>Shipment ID</TableHead>
            <TableHead>Lane</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Carrier</TableHead>
            <TableHead>Current Stage</TableHead>
            <TableHead>ETA</TableHead>
            <TableHead>Risk Factors</TableHead>
            <TableHead>Owner</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow
              key={alert.shipmentId}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick?.(alert.shipmentId)}
            >
              <TableCell>
                <Badge className={severityColors[alert.severity]}>
                  {alert.riskScore}
                </Badge>
              </TableCell>
              <TableCell className="font-mono font-medium">{alert.shipmentId}</TableCell>
              <TableCell>
                {alert.origin} → {alert.destination}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="flex items-center gap-1.5">
                  <span>{getModeIcon(alert.mode)}</span>
                  <span>{alert.mode}</span>
                </Badge>
              </TableCell>
              <TableCell>{alert.carrierName}</TableCell>
              <TableCell>{alert.currentStage}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{new Date(alert.plannedEta).toLocaleDateString()}</span>
                  <span className="text-xs text-muted-foreground">
                    {alert.daysToEta} days
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <TooltipProvider>
                  <div className="flex gap-1 flex-wrap">
                    {alert.riskReasons.map((reason) => {
                      const explanation = getRiskFactorExplanation(reason)
                      return (
                        <Tooltip
                          key={reason}
                          content={
                            <div className="space-y-1">
                              <div className="font-semibold text-teal-900">
                                {explanation.name}
                              </div>
                              <div className="text-xs text-teal-700 leading-relaxed">
                                {explanation.description}
                              </div>
                              <div className="text-xs text-teal-600 mt-1">
                                Severity: <span className="font-medium">{explanation.severity}</span>
                              </div>
                            </div>
                          }
                          side="top"
                        >
                          <span className="text-lg cursor-help" aria-label={explanation.name}>
                            {getRiskIcon(reason)}
                          </span>
                        </Tooltip>
                      )
                    })}
                  </div>
                </TooltipProvider>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{alert.owner}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

