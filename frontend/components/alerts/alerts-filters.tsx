'use client'

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

export const AlertsFilters = ({ filters, onFiltersChange, carriers }: AlertsFiltersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-teal-200 rounded-lg bg-white/95 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          placeholder="Shipment ID..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="severity">Severity</Label>
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
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
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

