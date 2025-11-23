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
import { AlertsFilters as FiltersType, Severity, Mode } from '@/types/alerts'

interface AlertsFiltersProps {
  filters: FiltersType
  onFiltersChange: (filters: FiltersType) => void
  carriers: string[]
}

const SEARCH_HISTORY_KEY = 'shipment-search-history'
const MAX_HISTORY_ITEMS = 10

export const AlertsFilters = ({ filters, onFiltersChange, carriers }: AlertsFiltersProps) => {
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (history) {
      try {
        setSearchHistory(JSON.parse(history))
      } catch {
        setSearchHistory([])
      }
    }
  }, [])

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined })
    setShowHistory(value.length === 0 && searchHistory.length > 0)
  }

  const handleSearchSubmit = (value: string) => {
    if (value.trim()) {
      const newHistory = [
        value.trim(),
        ...searchHistory.filter((item) => item !== value.trim()),
      ].slice(0, MAX_HISTORY_ITEMS)
      setSearchHistory(newHistory)
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
    }
    setShowHistory(false)
  }

  const handleHistorySelect = (item: string) => {
    onFiltersChange({ ...filters, search: item })
    setShowHistory(false)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-teal-200 rounded-lg bg-white/95 shadow-sm">
      <div className="space-y-2 relative">
        <Label htmlFor="search">Search</Label>
        <div className="relative">
          <Input
            id="search"
            name="shipment-search"
            type="text"
            autoComplete="off"
            placeholder="Shipment ID..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (!filters.search && searchHistory.length > 0) {
                setShowHistory(true)
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowHistory(false), 200)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit(e.currentTarget.value)
              }
            }}
          />
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-teal-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 text-sm text-slate-700"
                  onClick={() => handleHistorySelect(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="severity">Risk Score</Label>
        <Select
          value={filters.severity || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              severity: value === 'all' ? undefined : (value as Severity),
            })
          }
        >
          <SelectTrigger id="severity">
            <SelectValue placeholder="All risk scores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Scores</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Minimal">Minimal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mode">Mode</Label>
        <Select
          value={filters.mode || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              mode: value === 'all' ? undefined : (value as Mode),
            })
          }
        >
          <SelectTrigger id="mode">
            <SelectValue placeholder="All modes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="Air">Air</SelectItem>
            <SelectItem value="Sea">Sea</SelectItem>
            <SelectItem value="Road">Road</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="carrier">Carrier</Label>
        <Select
          value={filters.carrier || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              carrier: value === 'all' ? undefined : value,
            })
          }
        >
          <SelectTrigger id="carrier">
            <SelectValue placeholder="All carriers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Carriers</SelectItem>
            {carriers.map((carrier) => (
              <SelectItem key={carrier} value={carrier}>
                {carrier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

