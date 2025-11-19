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
import { AlertShipment, Severity } from '@/types/alerts'

interface AlertsTableProps {
  alerts: AlertShipment[]
  onRowClick?: (shipmentId: string) => void
}

const severityColors: Record<Severity, string> = {
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-orange-100 text-orange-800 border-orange-200',
  Low: 'bg-green-100 text-green-800 border-green-200',
}

const getRiskIcon = (reason: string) => {
  const icons: Record<string, string> = {
    StaleStatus: '🕒',
    PortCongestion: '🚢',
    CustomsHold: '📋',
    MissedDeparture: '✈️',
    LongDwell: '⏳',
    NoPickup: '📦',
    HubCongestion: '🏭',
    WeatherAlert: '🌧️',
    CapacityShortage: '📊',
    DocsMissing: '📄',
  }
  return icons[reason] || '⚠️'
}

export const AlertsTable = ({ alerts, onRowClick }: AlertsTableProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Risk Score</TableHead>
            <TableHead>Shipment ID</TableHead>
            <TableHead>Lane</TableHead>
            <TableHead>Mode</TableHead>
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
                <Badge variant="outline">{alert.mode}</Badge>
              </TableCell>
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
                <div className="flex gap-1 flex-wrap">
                  {alert.riskReasons.map((reason) => (
                    <span key={reason} title={reason} className="text-lg">
                      {getRiskIcon(reason)}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{alert.owner}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

