'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

type Filters = {
  year?: number
  month?: number
  status?: 'all' | 'completed' | 'in_progress' | 'canceled' | 'future'
  search?: string
}

export default function ShipmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Parse filters from URL query parameters
  const parseFiltersFromUrl = useMemo((): Filters => {
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    
    return {
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
      status: status && ['all', 'completed', 'in_progress', 'canceled', 'future'].includes(status) 
        ? (status as Filters['status'])
        : undefined,
      search: search || undefined,
    }
  }, [searchParams])
  
  const [filters, setFilters] = useState<Filters>(parseFiltersFromUrl)
  const [sortBy, setSortBy] = useState<SortField>('orderDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const isUpdatingFromUrl = useRef(false)
  
  // Update filters when URL changes (e.g., browser back/forward)
  useEffect(() => {
    // Only update if filters actually changed to avoid infinite loops
    setFilters((prevFilters) => {
      const filtersChanged = 
        parseFiltersFromUrl.year !== prevFilters.year ||
        parseFiltersFromUrl.month !== prevFilters.month ||
        parseFiltersFromUrl.status !== prevFilters.status ||
        parseFiltersFromUrl.search !== prevFilters.search
      
      if (filtersChanged) {
        isUpdatingFromUrl.current = true
        // Reset flag after state update
        setTimeout(() => {
          isUpdatingFromUrl.current = false
        }, 0)
        return parseFiltersFromUrl
      }
      return prevFilters
    })
  }, [parseFiltersFromUrl])
  
  // Update URL when filters change (but not when updating from URL)
  useEffect(() => {
    // Skip URL update if we're updating from URL (to avoid infinite loop)
    if (isUpdatingFromUrl.current) {
      return
    }
    
    const params = new URLSearchParams()
    
    if (filters.year) params.set('year', String(filters.year))
    if (filters.month) params.set('month', String(filters.month))
    if (filters.status && filters.status !== 'all') params.set('status', filters.status)
    if (filters.search) params.set('search', filters.search)
    
    const newUrl = params.toString() 
      ? `/shipments?${params.toString()}`
      : '/shipments'
    
    const currentUrl = window.location.pathname + window.location.search
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [filters, router])

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
            if (shipment.status === 'future') return 0
            if (shipment.status === 'canceled') return 1
            if (shipment.status === 'in_progress') return 2
            if (shipment.status === 'completed') return 3
            // Fallback logic
            const currentStageLower = shipment.currentStage.toLowerCase()
            if (currentStageLower.includes('refund') || currentStageLower.includes('canceled')) return 1
            if (currentStageLower.includes('received') || currentStageLower.includes('delivered')) return 3
            return 2
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

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters)
  }
  
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

        <ShipmentsFilters filters={filters} onFiltersChange={handleFiltersChange} />

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

