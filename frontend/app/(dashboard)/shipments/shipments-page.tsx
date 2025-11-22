'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { AlertShipment } from '@/types/alerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ShipmentsTable } from '@/components/tables/shipments-table'
import { ShipmentsFilters } from '@/components/shipments/shipments-filters'

type SortField = 
  | 'shipmentId'
  | 'status'
  | 'lane'
  | 'mode'
  | 'carrier'
  | 'currentStage'
  | 'eta'
  | 'orderDate'
  | 'owner'

type SortOrder = 'asc' | 'desc'

export default function ShipmentsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<{
    year?: number
    month?: number
    status?: 'all' | 'completed' | 'in_progress' | 'canceled'
    search?: string
  }>({})
  const [sortBy, setSortBy] = useState<SortField>('orderDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['shipments', filters],
    queryFn: () => apiClient.getShipments(filters),
  })

  const shipments = data?.data || []

  const sortedShipments = useMemo(() => {
    if (!shipments.length) return []

    const sorted = [...shipments].sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortBy) {
        case 'shipmentId':
          aValue = a.shipmentId
          bValue = b.shipmentId
          break
        case 'status':
          const getStatusPriority = (shipment: AlertShipment) => {
            if (shipment.status === 'canceled') return 0
            if (shipment.status === 'in_progress') return 1
            if (shipment.status === 'completed') return 2
            // Fallback logic
            const currentStageLower = shipment.currentStage.toLowerCase()
            if (currentStageLower.includes('refund') || currentStageLower.includes('canceled')) return 0
            if (currentStageLower.includes('received') || currentStageLower.includes('delivered')) return 2
            return 1
          }
          aValue = getStatusPriority(a)
          bValue = getStatusPriority(b)
          break
        case 'lane':
          aValue = `${a.origin} → ${a.destination}`
          bValue = `${b.origin} → ${b.destination}`
          break
        case 'mode':
          aValue = a.mode
          bValue = b.mode
          break
        case 'carrier':
          aValue = a.carrierName || ''
          bValue = b.carrierName || ''
          break
        case 'currentStage':
          aValue = a.currentStage
          bValue = b.currentStage
          break
        case 'eta':
          aValue = new Date(a.plannedEta).getTime()
          bValue = new Date(b.plannedEta).getTime()
          break
        case 'orderDate':
          const aDate = a.orderDate || a.lastMilestoneUpdate
          const bDate = b.orderDate || b.lastMilestoneUpdate
          aValue = new Date(aDate).getTime()
          bValue = new Date(bDate).getTime()
          break
        case 'owner':
          aValue = a.owner || ''
          bValue = b.owner || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [shipments, sortBy, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

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
              {sortedShipments.length} shipment{sortedShipments.length !== 1 ? 's' : ''} found
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
          <ShipmentsTable 
            shipments={sortedShipments} 
            onRowClick={handleRowClick}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </div>
    </div>
  )
}

