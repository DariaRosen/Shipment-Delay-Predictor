'use client'

import { useState, useMemo } from 'react'
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
import { AlertShipment, Severity, RiskReason, RiskFactorPoints } from '@/types/alerts'
import { getRiskFactorExplanation, formatRiskReason } from '@/lib/risk-factor-explanations'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type SortField =
  | 'riskScore'
  | 'shipmentId'
  | 'lane'
  | 'mode'
  | 'carrier'
  | 'currentStage'
  | 'eta'
  | 'owner'

type SortOrder = 'asc' | 'desc'

interface AlertsTableProps {
  alerts: AlertShipment[]
  onRowClick?: (shipmentId: string) => void
}

const severityColors: Record<Severity, string> = {
  Critical: 'bg-red-900 text-white border-red-950',
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-orange-100 text-orange-800 border-orange-200',
  Low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Minimal: 'bg-green-100 text-green-800 border-green-200',
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

const severityBaseScores: Record<Severity, number> = {
  Critical: 90,
  High: 70,
  Medium: 50,
  Low: 20,
  Minimal: 0,
}

const buildDisplayRiskFactors = (alert: AlertShipment): RiskFactorPoints[] => {
  const filtered =
    alert.riskFactorPoints
      ?.filter((rfp) => !(rfp.factor === 'Delayed' && rfp.points === 0))
      ?.map((rfp) => ({ ...rfp })) || []

  if (filtered.length === 0 && alert.riskScore > 0) {
    const baseScore = severityBaseScores[alert.severity] || 0
    if (baseScore > 0) {
      filtered.push({
        factor: 'DelayInSteps',
        points: baseScore,
        description: 'Delay detected between planned and actual milestone progress',
      })
    }
  }

  return filtered
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

const sortAlerts = (alerts: AlertShipment[], field: SortField, order: SortOrder): AlertShipment[] => {
  const sorted = [...alerts].sort((a, b) => {
    let comparison = 0

    switch (field) {
      case 'riskScore':
        comparison = a.riskScore - b.riskScore
        break
      case 'shipmentId':
        comparison = a.shipmentId.localeCompare(b.shipmentId)
        break
      case 'lane':
        const laneA = `${a.origin} → ${a.destination}`
        const laneB = `${b.origin} → ${b.destination}`
        comparison = laneA.localeCompare(laneB)
        break
      case 'mode':
        comparison = a.mode.localeCompare(b.mode)
        break
      case 'carrier':
        comparison = a.carrierName.localeCompare(b.carrierName)
        break
      case 'currentStage':
        comparison = a.currentStage.localeCompare(b.currentStage)
        break
      case 'eta':
        comparison = new Date(a.plannedEta).getTime() - new Date(b.plannedEta).getTime()
        break
      case 'owner':
        comparison = a.owner.localeCompare(b.owner)
        break
      default:
        return 0
    }

    return order === 'asc' ? comparison : -comparison
  })

  return sorted
}

export const AlertsTable = ({ alerts, onRowClick }: AlertsTableProps) => {
  const [sortBy, setSortBy] = useState<SortField>('riskScore')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to descending for riskScore, ascending for others
      setSortBy(field)
      setSortOrder(field === 'riskScore' ? 'desc' : 'asc')
    }
  }

  const sortedAlerts = useMemo(() => {
    return sortAlerts(alerts, sortBy, sortOrder)
  }, [alerts, sortBy, sortOrder])
  return (
    <div className="rounded-md border-teal-200 bg-white/95 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader
              field="riskScore"
              label="Risk Score"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <SortableHeader
              field="shipmentId"
              label="Shipment ID"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <SortableHeader
              field="lane"
              label="Lane"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <SortableHeader
              field="mode"
              label="Mode"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <SortableHeader
              field="carrier"
              label="Carrier"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <SortableHeader
              field="currentStage"
              label="Current Stage"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <SortableHeader
              field="eta"
              label="ETA"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            <TableHead>Risk Factors</TableHead>
            <SortableHeader
              field="owner"
              label="Owner"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAlerts.map((alert) => {
            const riskFactors = buildDisplayRiskFactors(alert)

            return (
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
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {riskFactors.length > 0 ? (
                      riskFactors
                      // Show risk factors with points breakdown
                        .sort((a: RiskFactorPoints, b: RiskFactorPoints) => {
                          // Sort: BaseScore first, then by points descending
                          if (a.factor === 'BaseScore') return -1;
                          if (b.factor === 'BaseScore') return 1;
                          return b.points - a.points;
                        })
                        .map((rfp: RiskFactorPoints, index: number) => {
                          // Get explanation for risk reason factors
                          const explanation = rfp.factor !== 'BaseScore' && 
                            rfp.factor !== 'LongDistance' && 
                            rfp.factor !== 'International' &&
                            rfp.factor !== 'PeakSeason' &&
                            rfp.factor !== 'WeekendDelay' &&
                            rfp.factor !== 'ExpressRisk' &&
                            rfp.factor !== 'DelayInSteps'
                            ? getRiskFactorExplanation(rfp.factor as RiskReason)
                            : null;
                          
                          const factorName = explanation?.name || 
                            (rfp.factor === 'BaseScore' ? 'Delay in steps' :
                             rfp.factor === 'DelayInSteps' ? 'Delay across steps' :
                             rfp.factor === 'LongDistance' ? 'Long Distance' :
                             rfp.factor === 'International' ? 'International' :
                             rfp.factor === 'PeakSeason' ? 'Peak Season' :
                             rfp.factor === 'WeekendDelay' ? 'Weekend Delay' :
                             rfp.factor === 'ExpressRisk' ? 'Express Risk' :
                             rfp.factor);
                          
                          const factorIcon = explanation?.icon || 
                            (rfp.factor === 'BaseScore' ? '🎯' :
                             rfp.factor === 'DelayInSteps' ? '⏱️' :
                             rfp.factor === 'LongDistance' ? '📏' :
                             rfp.factor === 'International' ? '🌍' :
                             rfp.factor === 'PeakSeason' ? '🎄' :
                             rfp.factor === 'WeekendDelay' ? '📅' :
                             rfp.factor === 'ExpressRisk' ? '⚡' :
                             '⚠️');
                          
                          const tooltipDescription = rfp.description || explanation?.description || '';
                          
                          return (
                            <Tooltip
                              key={`${rfp.factor}-${index}`}
                              content={
                                <div className="space-y-1">
                                  <div className="font-semibold text-teal-900">
                                    {factorName}
                                  </div>
                                  {tooltipDescription && (
                                    <div className="text-xs text-teal-700 leading-relaxed">
                                      {tooltipDescription}
                                    </div>
                                  )}
                                  {explanation && (
                                    <div className="text-xs text-teal-600 mt-1">
                                      Severity: <span className="font-medium">{explanation.severity}</span>
                                    </div>
                                  )}
                                </div>
                              }
                              side="top"
                            >
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 border border-teal-200 rounded text-xs">
                                <span className="text-sm" aria-label={factorName}>
                                  {factorIcon}
                                </span>
                                <span className="font-semibold text-teal-900">
                                  +{rfp.points}
                                </span>
                              </div>
                            </Tooltip>
                          );
                        })
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        No risk signals yet
                      </Badge>
                    )}
                    {alert.riskReasons.length > 0 && riskFactors.length === 0 ? (
                      // Fallback: show risk reasons without points (for backwards compatibility)
                      alert.riskReasons.map((reason) => {
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
                      })
                    ) : null}
                  </div>
                </TooltipProvider>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{alert.owner}</TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  )
}

