'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SeverityDonut } from '@/components/charts/severity-donut'
import { RiskCausesBar } from '@/components/charts/risk-causes-bar'
import { AlertShipment, Severity, RiskReason } from '@/types/alerts'
import { formatRiskReason, getRiskFactorExplanation } from '@/lib/risk-factor-explanations'
import { useMemo } from 'react'

interface AlertsSummaryProps {
  alerts: AlertShipment[]
}

export const AlertsSummary = ({ alerts }: AlertsSummaryProps) => {
  const severityCounts = useMemo(() => {
    return alerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1
        return acc
      },
      {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        Minimal: 0,
      } as Record<Severity, number>,
    )
  }, [alerts])

  const severityData = useMemo(
    () =>
      Object.entries(severityCounts).map(([severity, count]) => ({
        severity: severity as Severity,
        count,
      })),
    [severityCounts],
  )

  const additionalFactorMeta: Record<string, { label: string; description: string }> = {
    BaseScore: { label: 'Delay in steps', description: 'Base delay component from missed milestones.' },
    DelayInSteps: { label: 'Delay in steps', description: 'Base delay component from missed milestones.' },
    LongDistance: { label: 'Long Distance', description: 'Extended transit times on very long routes.' },
    International: { label: 'International Shipment', description: 'Additional processing for cross-border moves.' },
    PeakSeason: { label: 'Peak Season (Nov/Dec)', description: 'Seasonal congestion around holidays.' },
    WeekendDelay: { label: 'Weekend Processing Delay', description: 'Facilities paused over the weekend.' },
    ExpressRisk: { label: 'Express Service Risk', description: 'Express service not meeting promised timeline.' },
  }

  const riskCausesData = useMemo(() => {
    const counts: Record<
      string,
      {
        label: string
        description?: string
        shipmentIds: Set<string>
      }
    > = {}

    const addShipment = (key: string, label: string, description: string | undefined, shipmentId: string) => {
      if (!counts[key]) {
        counts[key] = { label, description, shipmentIds: new Set() }
      }
      counts[key].shipmentIds.add(shipmentId)
    }

    alerts.forEach((alert) => {
      const shipmentId = alert.shipmentId
      const seenFactors = new Set<string>()

      // Process riskReasons first
      alert.riskReasons.forEach((reason) => {
        if (!seenFactors.has(reason)) {
          seenFactors.add(reason)
          const explanation = getRiskFactorExplanation(reason)
          addShipment(reason, explanation.name, explanation.description, shipmentId)
        }
      })

      // Process riskFactorPoints, avoiding duplicates
      alert.riskFactorPoints?.forEach((factor) => {
        // Normalize: BaseScore and DelayInSteps both map to "Delay in steps"
        const factorKey = factor.factor === 'BaseScore' ? 'DelayInSteps' : factor.factor

        // Skip if we already counted this factor from riskReasons
        if (seenFactors.has(factorKey)) {
          return
        }

        seenFactors.add(factorKey)
        const meta = additionalFactorMeta[factor.factor]
        const fallbackLabel =
          formatRiskReason(factor.factor as RiskReason) || factor.factor.replace(/([A-Z])/g, ' $1').trim()
        addShipment(
          factorKey,
          meta?.label ?? fallbackLabel,
          factor.description ?? meta?.description ?? 'Driver for the aggregated risk score.',
          shipmentId,
        )
      })
    })

    return Object.entries(counts)
      .map(([reasonKey, value]) => ({
        reasonKey,
        label: value.label,
        count: value.shipmentIds.size, // Count unique shipments, not occurrences
        description: value.description,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [alerts])

  const severityOrder: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Minimal']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <Card className="border-teal-200 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-teal-900">Total At-Risk Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-teal-700">{alerts.length}</div>
          <div className="text-sm text-teal-700 mt-3 space-y-1">
            {severityOrder.map((severity) => {
              const count = severityCounts[severity] ?? 0
              return (
                <div key={severity} className="flex items-center gap-2">
                  <span className="font-semibold">{severity}:</span>
                  <span>
                    {count} shipment{count === 1 ? '' : 's'}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-teal-200 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-teal-900">Alerts by Severity</CardTitle>
        </CardHeader>
        <CardContent>
          <SeverityDonut data={severityData} />
        </CardContent>
      </Card>

      <Card className="border-teal-200 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-teal-900">Top Risk Causes</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskCausesBar data={riskCausesData} />
        </CardContent>
      </Card>
    </div>
  )
}

