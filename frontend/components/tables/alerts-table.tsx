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
import { AlertShipment, Severity, RiskReason, RiskFactorPoints } from '@/types/alerts'
import { getRiskFactorExplanation, formatRiskReason } from '@/lib/risk-factor-explanations'

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
          {alerts.map((alert) => {
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

