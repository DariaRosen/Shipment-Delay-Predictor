'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SeverityDonut } from '@/components/charts/severity-donut'
import { RiskCausesBar } from '@/components/charts/risk-causes-bar'
import { AlertShipment, Severity, RiskReason } from '@/types/alerts'
import { formatRiskReason } from '@/lib/risk-factor-explanations'
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

  const additionalFactorLabels: Record<string, string> = {
    BaseScore: 'Delay in steps',
    DelayInSteps: 'Delay in steps',
    LongDistance: 'Long Distance',
    International: 'International Shipment',
    PeakSeason: 'Peak Season (Nov/Dec)',
    WeekendDelay: 'Weekend Processing Delay',
    ExpressRisk: 'Express Service Risk',
  }

  const riskCausesData = useMemo(() => {
    const counts: Record<string, number> = {}

    const increment = (label: string) => {
      counts[label] = (counts[label] || 0) + 1
    }

    alerts.forEach((alert) => {
      alert.riskReasons.forEach((reason) => {
        increment(formatRiskReason(reason))
      })

      alert.riskFactorPoints?.forEach((factor) => {
        const label =
          additionalFactorLabels[factor.factor as keyof typeof additionalFactorLabels] ||
          formatRiskReason(factor.factor as unknown as RiskReason) ||
          factor.factor.replace(/([A-Z])/g, ' $1').trim()
        increment(label)
      })
    })

    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
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

