'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SeverityDonut } from '@/components/charts/severity-donut'
import { RiskCausesBar } from '@/components/charts/risk-causes-bar'
import { AlertShipment, Severity } from '@/types/alerts'
import { useMemo } from 'react'

interface AlertsSummaryProps {
  alerts: AlertShipment[]
}

export const AlertsSummary = ({ alerts }: AlertsSummaryProps) => {
  const severityData = useMemo(() => {
    const counts = alerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1
        return acc
      },
      {} as Record<Severity, number>
    )
    return Object.entries(counts).map(([severity, count]) => ({
      severity: severity as Severity,
      count,
    }))
  }, [alerts])

  const riskCausesData = useMemo(() => {
    const counts: Record<string, number> = {}
    alerts.forEach((alert) => {
      alert.riskReasons.forEach((reason) => {
        counts[reason] = (counts[reason] || 0) + 1
      })
    })
    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [alerts])

  const highRiskCount = alerts.filter((a) => a.severity === 'High').length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>Total At-Risk Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{alerts.length}</div>
          <p className="text-sm text-muted-foreground mt-2">
            {highRiskCount} high priority alerts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts by Severity</CardTitle>
        </CardHeader>
        <CardContent>
          <SeverityDonut data={severityData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Risk Causes</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskCausesBar data={riskCausesData} />
        </CardContent>
      </Card>
    </div>
  )
}

