'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { AlertShipment } from '@/types/alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ArrowLeft, MapPin, Info } from 'lucide-react'
import { format } from 'date-fns'
import { ShipmentTimeline } from '@/components/shipment/shipment-timeline'
import { getRiskFactorExplanation } from '@/lib/risk-factor-explanations'
import { RiskReason, RiskFactorPoints } from '@/types/alerts'

interface ShipmentDetailPageProps {
  shipmentId: string
}

export function ShipmentDetailPage({ shipmentId }: ShipmentDetailPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get return URL from query params or use browser history
  const handleBack = () => {
    const returnTo = searchParams.get('returnTo')
    if (returnTo) {
      router.push(returnTo)
    } else {
      // Use browser history to go back to the previous page
      router.back()
    }
  }

  const { data, isLoading, error } = useQuery<AlertShipment>({
    queryKey: ['shipment', shipmentId],
    queryFn: () => apiClient.getShipment(shipmentId),
    staleTime: 0, // Always fetch fresh data
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-[#E6FFFA] to-teal-100">
        <div className="container mx-auto p-6">
          <Card className="border-teal-200 bg-white/95">
            <CardContent className="py-12">
              <div className="text-center text-teal-600">Loading shipment details...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-[#E6FFFA] to-teal-100">
        <div className="container mx-auto p-6">
          <Card className="border-red-200 bg-white/95">
            <CardHeader>
              <CardTitle className="text-red-600">Shipment Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Shipment {shipmentId} was not found.</p>
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const shipment = data

  const severityColors: Record<string, string> = {
    Critical: 'bg-red-900 text-white border-red-950',
    High: 'bg-red-100 text-red-800 border-red-200',
    Medium: 'bg-orange-100 text-orange-800 border-orange-200',
    Low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Minimal: 'bg-green-100 text-green-800 border-green-200',
  }

  const severityBaseScores: Record<string, number> = {
    Critical: 90,
    High: 70,
    Medium: 50,
    Low: 20,
    Minimal: 0,
  }

  const displayRiskFactors = (() => {
    const filtered =
      shipment.riskFactorPoints
        ?.filter((rfp) => !(rfp.factor === 'Delayed' && rfp.points === 0))
        ?.map((rfp) => ({ ...rfp })) || []

    if (filtered.length === 0 && shipment.riskScore > 0) {
      const baseScore = severityBaseScores[shipment.severity] || 0
      if (baseScore > 0) {
        filtered.push({
          factor: 'DelayInSteps',
          points: baseScore,
          description: 'Delay detected between planned and actual milestone progress',
        })
      }
    }

    return filtered
  })()

  const getModeIcon = (mode: string) => {
    const icons: Record<string, string> = {
      Air: '✈️',
      Sea: '🚢',
      Road: '🚚',
    }
    return icons[mode] || ''
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-[#E6FFFA] to-teal-100">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="icon"
              className="hover:bg-teal-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-teal-900">Shipment Details</h1>
              <p className="text-teal-700 mt-1 font-mono">{shipment.shipmentId}</p>
            </div>
          </div>
        </div>

        {/* Shipment Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-teal-200 bg-white/95">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-teal-700">Route</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-600" />
                <span className="font-semibold">{shipment.origin}</span>
                <span className="text-teal-600">→</span>
                <span className="font-semibold">{shipment.destination}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-teal-200 bg-white/95">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-teal-700">Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-xl">{getModeIcon(shipment.mode)}</span>
                <span className="font-semibold">{shipment.mode}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-teal-200 bg-white/95">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-teal-700">Carrier</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{shipment.carrierName}</p>
              <p className="text-sm text-muted-foreground">{shipment.serviceLevel}</p>
            </CardContent>
          </Card>

          <Card className="border-teal-200 bg-white/95">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-teal-700">Expected Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{format(new Date(shipment.plannedEta), 'MMM dd, yyyy')}</p>
              <p className="text-sm text-muted-foreground">
                {shipment.daysToEta === 0 ? 'Today' : `${shipment.daysToEta} day${shipment.daysToEta !== 1 ? 's' : ''} remaining`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Factors */}
        <Card className="border-teal-200 bg-white/95">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-teal-900">Risk Factors</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={severityColors[shipment.severity]}>
                  {shipment.severity}
                </Badge>
                <Badge variant="outline" className="text-sm font-semibold">
                  Total Score: {shipment.riskScore}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="space-y-3">
                {(() => {
                  if (displayRiskFactors.length > 0) {
                    return displayRiskFactors
                      .sort((a, b) => {
                        if (a.factor === 'BaseScore') return -1
                        if (b.factor === 'BaseScore') return 1
                        return b.points - a.points
                      })
                      .map((rfp, index) => {
                        const explanation =
                          rfp.factor !== 'BaseScore' &&
                          rfp.factor !== 'LongDistance' &&
                          rfp.factor !== 'International' &&
                          rfp.factor !== 'PeakSeason' &&
                          rfp.factor !== 'WeekendDelay' &&
                          rfp.factor !== 'ExpressRisk' &&
                          rfp.factor !== 'DelayInSteps'
                            ? getRiskFactorExplanation(rfp.factor as RiskReason)
                            : null

                        const factorName =
                          explanation?.name ||
                          (rfp.factor === 'BaseScore'
                            ? 'Delay in steps'
                            : rfp.factor === 'DelayInSteps'
                              ? 'Delay across steps'
                            : rfp.factor === 'LongDistance'
                              ? 'Long Distance'
                              : rfp.factor === 'International'
                                ? 'International Shipment'
                                : rfp.factor === 'PeakSeason'
                                  ? 'Peak Season (Nov/Dec)'
                                  : rfp.factor === 'WeekendDelay'
                                    ? 'Weekend Processing Delay'
                                    : rfp.factor === 'ExpressRisk'
                                      ? 'Express Service Risk'
                                      : rfp.factor)

                        const factorIcon =
                          explanation?.icon ||
                          (rfp.factor === 'BaseScore'
                            ? '🎯'
                            : rfp.factor === 'DelayInSteps'
                              ? '⏱️'
                            : rfp.factor === 'LongDistance'
                              ? '📏'
                              : rfp.factor === 'International'
                                ? '🌍'
                                : rfp.factor === 'PeakSeason'
                                  ? '🎄'
                                  : rfp.factor === 'WeekendDelay'
                                    ? '📅'
                                    : rfp.factor === 'ExpressRisk'
                                      ? '⚡'
                                      : '⚠️')

                        const factorDescription = rfp.description || explanation?.description || ''
                        const factorSeverity =
                          explanation?.severity || (rfp.points >= 8 ? 'High' : rfp.points >= 5 ? 'Medium' : 'Low')

                        return (
                          <div
                            key={`${rfp.factor}-${index}`}
                            className="flex items-start gap-3 p-3 rounded-lg border border-teal-200 bg-teal-50/50"
                          >
                            <div className="text-2xl flex-shrink-0">{factorIcon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-teal-900">{factorName}</h4>
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-bold ${
                                    factorSeverity === 'High'
                                      ? 'border-red-200 text-red-800 bg-red-50'
                                      : factorSeverity === 'Medium'
                                        ? 'border-orange-200 text-orange-800 bg-orange-50'
                                        : 'border-yellow-200 text-yellow-800 bg-yellow-50'
                                  }`}
                                >
                                  +{rfp.points} points
                                </Badge>
                                {explanation && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      explanation.severity === 'High'
                                        ? 'border-red-200 text-red-800'
                                        : explanation.severity === 'Medium'
                                          ? 'border-orange-200 text-orange-800'
                                          : 'border-yellow-200 text-yellow-800'
                                    }`}
                                  >
                                    {explanation.severity}
                                  </Badge>
                                )}
                              </div>
                              {factorDescription && (
                                <p className="text-sm text-teal-700 leading-relaxed">{factorDescription}</p>
                              )}
                            </div>
                          </div>
                        )
                      })
                  }

                  if (shipment.riskReasons.length > 0) {
                    return shipment.riskReasons.map((reason) => {
                      const explanation = getRiskFactorExplanation(reason)
                      return (
                        <div
                          key={reason}
                          className="flex items-start gap-3 p-3 rounded-lg border border-teal-200 bg-teal-50/50"
                        >
                          <div className="text-2xl flex-shrink-0">{explanation.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-teal-900">{explanation.name}</h4>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  explanation.severity === 'High'
                                    ? 'border-red-200 text-red-800'
                                    : explanation.severity === 'Medium'
                                      ? 'border-orange-200 text-orange-800'
                                      : 'border-yellow-200 text-yellow-800'
                                }`}
                              >
                                {explanation.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-teal-700 leading-relaxed">{explanation.description}</p>
                          </div>
                        </div>
                      )
                    })
                  }

                  return (
                    <div className="rounded-lg border border-dashed border-teal-200 bg-teal-50/50 p-4 text-sm text-teal-700">
                      This shipment doesn’t have explicit risk signals yet, but it is being monitored (score {shipment.riskScore}).
                    </div>
                  )
                })()}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="border-teal-200 bg-white/95">
          <CardHeader>
            <CardTitle className="text-teal-900">Shipment Timeline</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Current stage: <span className="font-semibold">{shipment.currentStage}</span>
            </p>
          </CardHeader>
          <CardContent>
            <ShipmentTimeline
              steps={shipment.steps || []}
              plannedEta={shipment.plannedEta}
              currentStage={shipment.currentStage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

