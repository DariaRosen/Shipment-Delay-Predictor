'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAlerts } from '@/hooks/use-alerts'
import { AlertsTable } from '@/components/tables/alerts-table'
import { AlertsFilters } from '@/components/alerts/alerts-filters'
import { AlertsSummary } from '@/components/alerts/alerts-summary'
import { AlertsFilters as FiltersType } from '@/types/alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

export function AlertsDashboardPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<FiltersType>({})

  const { data, isLoading, error, dataUpdatedAt } = useAlerts(filters)

  const alerts = data?.data || []
  const carriers = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.carrierName))).sort(),
    [alerts]
  )

  const handleRowClick = (shipmentId: string) => {
    router.push(`/shipment/${shipmentId}`)
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Alerts fetch error:', error)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-[#E6FFFA] to-teal-100 p-6">
        <Card className="border-destructive bg-white/95">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-destructive">Failed to load alerts. Please try again later.</p>
            <div className="text-sm text-muted-foreground">
              <p><strong>Error:</strong> {errorMessage}</p>
              <p className="mt-2">
                <strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not set'}
              </p>
              <p className="mt-2 text-xs">
                Check the browser console for more details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-[#E6FFFA] to-teal-100">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-teal-900">At-Risk Shipments</h1>
            <p className="text-teal-700 mt-1">
              {alerts.length} shipment{alerts.length !== 1 ? 's' : ''} requiring attention
            </p>
          </div>
          {dataUpdatedAt && (
            <div className="text-sm text-teal-600">
              Last updated: {format(new Date(dataUpdatedAt), 'PPp')}
            </div>
          )}
        </div>

      <AlertsSummary alerts={alerts} />

      <AlertsFilters filters={filters} onFiltersChange={setFilters} carriers={carriers} />

        {isLoading ? (
          <Card className="border-teal-200 bg-white/95">
            <CardContent className="py-12">
              <div className="text-center text-teal-600">Loading alerts...</div>
            </CardContent>
          </Card>
        ) : alerts.length === 0 ? (
          <Card className="border-teal-200 bg-white/95">
            <CardContent className="py-12">
              <div className="text-center text-teal-600">
                No alerts found matching your filters.
              </div>
            </CardContent>
          </Card>
        ) : (
          <AlertsTable alerts={alerts} onRowClick={handleRowClick} />
        )}
      </div>
    </div>
  )
}

