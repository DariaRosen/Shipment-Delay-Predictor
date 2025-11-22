'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { AlertShipment } from '@/types/alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ShipmentsTable } from '@/components/tables/shipments-table'
import { ShipmentsFilters } from '@/components/shipments/shipments-filters'

export default function ShipmentsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<{
    year?: number
    month?: number
    status?: 'all' | 'completed' | 'incomplete'
    search?: string
  }>({})

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['shipments', filters],
    queryFn: () => apiClient.getShipments(filters),
  })

  const shipments = data?.data || []

  const handleRowClick = (shipmentId: string) => {
    router.push(`/shipment/${shipmentId}`)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-[#E6FFFA] to-teal-100 p-6">
        <Card className="border-red-200 bg-white/95">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load shipments. Please try again later.</p>
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
            <h1 className="text-3xl font-bold text-teal-900">All Shipments</h1>
            <p className="text-teal-700 mt-1">
              {shipments.length} shipment{shipments.length !== 1 ? 's' : ''} found
            </p>
          </div>
          {dataUpdatedAt && (
            <div className="text-sm text-teal-600">
              Last updated: {format(new Date(dataUpdatedAt), 'PPp')}
            </div>
          )}
        </div>

        <ShipmentsFilters filters={filters} onFiltersChange={setFilters} />

        {isLoading ? (
          <Card className="border-teal-200 bg-white/95">
            <CardContent className="py-12">
              <div className="text-center text-teal-600">Loading shipments...</div>
            </CardContent>
          </Card>
        ) : shipments.length === 0 ? (
          <Card className="border-teal-200 bg-white/95">
            <CardContent className="py-12">
              <div className="text-center text-teal-600">
                No shipments found matching your filters.
              </div>
            </CardContent>
          </Card>
        ) : (
          <ShipmentsTable shipments={shipments} onRowClick={handleRowClick} />
        )}
      </div>
    </div>
  )
}

