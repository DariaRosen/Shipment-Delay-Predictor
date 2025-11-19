'use client'

import { useState, useMemo } from 'react'
import { useAlerts } from '@/hooks/use-alerts'
import { AlertsTable } from '@/components/tables/alerts-table'
import { AlertsFilters } from '@/components/alerts/alerts-filters'
import { AlertsSummary } from '@/components/alerts/alerts-summary'
import { AlertsFilters as FiltersType } from '@/types/alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

export default function AlertsPage() {
  const [filters, setFilters] = useState<FiltersType>({})

  const { data, isLoading, error, dataUpdatedAt } = useAlerts(filters)

  const alerts = data?.data || []
  const carriers = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.carrierName))).sort(),
    [alerts]
  )

  const handleRowClick = (shipmentId: string) => {
    // Navigate to detail page
    console.log('Navigate to:', shipmentId)
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load alerts. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">At-Risk Shipments</h1>
          <p className="text-muted-foreground mt-1">
            {alerts.length} shipment{alerts.length !== 1 ? 's' : ''} requiring attention
          </p>
        </div>
        {dataUpdatedAt && (
          <div className="text-sm text-muted-foreground">
            Last updated: {format(new Date(dataUpdatedAt), 'PPp')}
          </div>
        )}
      </div>

      <AlertsSummary alerts={alerts} />

      <AlertsFilters filters={filters} onFiltersChange={setFilters} carriers={carriers} />

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">Loading alerts...</div>
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              No alerts found matching your filters.
            </div>
          </CardContent>
        </Card>
      ) : (
        <AlertsTable alerts={alerts} onRowClick={handleRowClick} />
      )}
    </div>
  )
}

