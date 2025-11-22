'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { AlertShipment } from '@/types/alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { ShipmentTimeline } from '@/components/shipment/shipment-timeline'

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
        {data.riskReasons.length > 0 && (
          <Card className="border-teal-200 bg-white/95">
            <CardHeader>
              <CardTitle className="text-teal-900">Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.riskReasons.map((reason) => (
                  <Badge key={reason} variant="outline" className="border-orange-200 text-orange-800">
                    {reason.replace(/([A-Z])/g, ' $1').trim()}
                  </Badge>
                ))}
              </div>
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

