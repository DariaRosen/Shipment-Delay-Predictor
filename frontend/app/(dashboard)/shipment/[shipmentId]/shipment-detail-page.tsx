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
    cacheTime: 0, // Don't cache to ensure consistency
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

  const severityColors: Record<string, string> = {
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
              <p className="text-teal-700 mt-1 font-mono">{data.shipmentId}</p>
            </div>
          </div>
          <Badge className={severityColors[data.severity]}>{data.riskScore}</Badge>
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
                <span className="font-semibold">{data.origin}</span>
                <span className="text-teal-600">→</span>
                <span className="font-semibold">{data.destination}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-teal-200 bg-white/95">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-teal-700">Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-xl">{getModeIcon(data.mode)}</span>
                <span className="font-semibold">{data.mode}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-teal-200 bg-white/95">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-teal-700">Carrier</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{data.carrierName}</p>
              <p className="text-sm text-muted-foreground">{data.serviceLevel}</p>
            </CardContent>
          </Card>

          <Card className="border-teal-200 bg-white/95">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-teal-700">Expected Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{format(new Date(data.plannedEta), 'MMM dd, yyyy')}</p>
              <p className="text-sm text-muted-foreground">
                {data.daysToEta === 0 ? 'Today' : `${data.daysToEta} day${data.daysToEta !== 1 ? 's' : ''} remaining`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Factors */}
        {((data.riskFactorPoints && data.riskFactorPoints.length > 0) || data.riskReasons.length > 0) && (
          <Card className="border-teal-200 bg-white/95">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-teal-900">Risk Factors</CardTitle>
                <Badge className={severityColors[data.severity]} variant="outline">
                  Total Score: {data.riskScore}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="space-y-3">
                  {data.riskFactorPoints && data.riskFactorPoints.length > 0 ? (
                    // Show detailed breakdown with points
                    data.riskFactorPoints
                      .filter((rfp: RiskFactorPoints) => {
                        // Skip Delayed if it has 0 points (delay already shown in base score)
                        if (rfp.factor === 'Delayed' && rfp.points === 0) {
                          return false;
                        }
                        return true;
                      })
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
                          rfp.factor !== 'ExpressRisk'
                          ? getRiskFactorExplanation(rfp.factor as RiskReason)
                          : null;
                        
                        const factorName = explanation?.name || 
                          (rfp.factor === 'BaseScore' ? 'Base Score (Delivery Delayed)' :
                           rfp.factor === 'LongDistance' ? 'Long Distance' :
                           rfp.factor === 'International' ? 'International Shipment' :
                           rfp.factor === 'PeakSeason' ? 'Peak Season (Nov/Dec)' :
                           rfp.factor === 'WeekendDelay' ? 'Weekend Processing Delay' :
                           rfp.factor === 'ExpressRisk' ? 'Express Service Risk' :
                           rfp.factor);
                        
                        const factorIcon = explanation?.icon || 
                          (rfp.factor === 'BaseScore' ? '🎯' :
                           rfp.factor === 'LongDistance' ? '📏' :
                           rfp.factor === 'International' ? '🌍' :
                           rfp.factor === 'PeakSeason' ? '🎄' :
                           rfp.factor === 'WeekendDelay' ? '📅' :
                           rfp.factor === 'ExpressRisk' ? '⚡' :
                           '⚠️');
                        
                        const factorDescription = rfp.description || explanation?.description || '';
                        const factorSeverity = explanation?.severity || 
                          (rfp.points >= 8 ? 'High' : rfp.points >= 5 ? 'Medium' : 'Low');
                        
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
                                <p className="text-sm text-teal-700 leading-relaxed">
                                  {factorDescription}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    // Fallback: show risk reasons without points (for backwards compatibility)
                    data.riskReasons.map((reason) => {
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
                            <p className="text-sm text-teal-700 leading-relaxed">
                              {explanation.description}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card className="border-teal-200 bg-white/95">
          <CardHeader>
            <CardTitle className="text-teal-900">Shipment Timeline</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Current stage: <span className="font-semibold">{data.currentStage}</span>
            </p>
          </CardHeader>
          <CardContent>
            <ShipmentTimeline
              steps={data.steps || []}
              plannedEta={data.plannedEta}
              currentStage={data.currentStage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

