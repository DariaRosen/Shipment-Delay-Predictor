'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface ShipmentsFiltersProps {
  filters: {
    year?: number
    month?: number
    status?: 'all' | 'completed' | 'in_progress' | 'canceled' | 'future'
    search?: string
  }
  onFiltersChange: (filters: {
    year?: number
    month?: number
    status?: 'all' | 'completed' | 'in_progress' | 'canceled' | 'future'
    search?: string
  }) => void
}

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export const ShipmentsFilters = ({ filters, onFiltersChange }: ShipmentsFiltersProps) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-teal-200 rounded-lg bg-white/95 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          type="text"
          placeholder="Shipment ID..."
          value={filters.search || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value || undefined })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="year">Year</Label>
        {isMounted ? (
          <Select
            value={filters.year ? String(filters.year) : 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                year: value === 'all' ? undefined : parseInt(value, 10),
                month: value === 'all' ? undefined : filters.month, // Clear month if year is cleared
              })
            }
          >
            <SelectTrigger id="year">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm flex items-center text-muted-foreground">
            Loading...
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="month">Month</Label>
        {isMounted ? (
          <Select
            value={filters.month ? String(filters.month) : 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                month: value === 'all' ? undefined : parseInt(value, 10),
              })
            }
            disabled={!filters.year}
          >
            <SelectTrigger id="month">
              <SelectValue placeholder="All months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={String(month.value)}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm flex items-center text-muted-foreground">
            Loading...
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        {isMounted ? (
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                status: value === 'all' ? undefined : (value as 'completed' | 'in_progress' | 'canceled' | 'future'),
              })
            }
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="future">Future</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm flex items-center text-muted-foreground">
            Loading...
          </div>
        )}
      </div>
    </div>
  )
}

