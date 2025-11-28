'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertsFilters as FiltersType, Severity, Mode, RiskReason, RiskFactorFilter } from '@/types/alerts'
import { getRiskFactorExplanation } from '@/lib/risk-factor-explanations'
import { X, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'

interface AlertsFiltersProps {
  filters: FiltersType
  onFiltersChange: (filters: FiltersType) => void
  carriers: string[]
  serviceLevels: string[]
  owners: string[]
}

const RISK_REASONS: RiskReason[] = [
  'StaleStatus',
  'PortCongestion',
  'CustomsHold',
  'MissedDeparture',
  'Delayed',
  'LongDwell',
  'NoPickup',
  'HubCongestion',
  'WeatherAlert',
  'CapacityShortage',
  'DocsMissing',
  'Lost',
]

// All risk factors including contextual ones
const ALL_RISK_FACTORS: RiskFactorFilter[] = [
  ...RISK_REASONS,
  'DelayInSteps',
  'LongDistance',
  'International',
  'PeakSeason',
  'WeekendDelay',
  'ExpressRisk',
]

const getRiskFactorLabel = (factor: RiskFactorFilter): string => {
  // Handle contextual factors
  if (factor === 'DelayInSteps' || factor === 'BaseScore') {
    return 'Delay in steps'
  }
  if (factor === 'LongDistance') {
    return 'Long Distance'
  }
  if (factor === 'International') {
    return 'International Shipment'
  }
  if (factor === 'PeakSeason') {
    return 'Peak Season (Nov/Dec)'
  }
  if (factor === 'WeekendDelay') {
    return 'Weekend Processing Delay'
  }
  if (factor === 'ExpressRisk') {
    return 'Express Service Risk'
  }
  // For RiskReason types, get from explanation
  const explanation = getRiskFactorExplanation(factor as RiskReason)
  return explanation.name
}

export const AlertsFilters = ({ filters, onFiltersChange, carriers, serviceLevels, owners }: AlertsFiltersProps) => {
  const isMounted = typeof window !== 'undefined'
  const [showAdvanced, setShowAdvanced] = useState(false)
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const removeFilter = (key: keyof FiltersType) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }

  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).filter(key => {
      const value = filters[key as keyof FiltersType]
      return value !== undefined && value !== null && value !== ''
    }).length
  }, [filters])

  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="space-y-4">
      {/* Main Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border-teal-200 rounded-lg bg-white/95 shadow-sm">
        {/* Enhanced Search */}
        <div className="space-y-2 relative">
          <Label htmlFor="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </Label>
          <Input
            id="search"
            name="shipment-search"
            type="text"
            autoComplete="off"
            placeholder="Shipment ID, origin, destination, owner..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Risk Score Filter */}
        <div className="space-y-2">
          <Label htmlFor="severity">Risk Score</Label>
          {isMounted ? (
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
          ) : (
            <div className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm flex items-center text-muted-foreground">
              Loading...
            </div>
          )}
        </div>

        {/* Mode Filter */}
        <div className="space-y-2">
          <Label htmlFor="mode">Mode</Label>
          {isMounted ? (
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
          ) : (
            <div className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm flex items-center text-muted-foreground">
              Loading...
            </div>
          )}
        </div>

        {/* Carrier Filter */}
        <div className="space-y-2">
          <Label htmlFor="carrier">Carrier</Label>
          {isMounted ? (
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
          ) : (
            <div className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm flex items-center text-muted-foreground">
              Loading...
            </div>
          )}
        </div>
      </div>

      {/* Active Filters & Clear Button */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap p-2">
          <div className="flex items-center gap-2 text-sm text-teal-700">
            <Filter className="h-4 w-4" />
            <span>Active filters:</span>
            <Badge variant="secondary" className="bg-teal-100 text-teal-800">
              {activeFilterCount}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {filters.severity && (
              <Badge variant="outline" className="gap-1">
                Risk: {filters.severity}
                <button
                  type="button"
                  onClick={() => removeFilter('severity')}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.mode && (
              <Badge variant="outline" className="gap-1">
                Mode: {filters.mode}
                <button
                  type="button"
                  onClick={() => removeFilter('mode')}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.carrier && (
              <Badge variant="outline" className="gap-1">
                Carrier: {filters.carrier}
                <button
                  type="button"
                  onClick={() => removeFilter('carrier')}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.search && (
              <Badge variant="outline" className="gap-1">
                Search: {filters.search}
                <button
                  type="button"
                  onClick={() => removeFilter('search')}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.riskFactor && (
              <Badge variant="outline" className="gap-1">
                Factor: {getRiskFactorLabel(filters.riskFactor)}
                <button
                  type="button"
                  onClick={() => removeFilter('riskFactor')}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filters.origin || filters.destination || filters.owner || filters.serviceLevel ||
              filters.minRiskScore !== undefined || filters.maxRiskScore !== undefined ||
              filters.minDaysToEta !== undefined || filters.maxDaysToEta !== undefined) && (
              <Badge variant="outline" className="gap-1">
                +{activeFilterCount - (filters.severity ? 1 : 0) - (filters.mode ? 1 : 0) - (filters.carrier ? 1 : 0) - (filters.search ? 1 : 0) - (filters.riskFactor ? 1 : 0)} more
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="ml-auto"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Advanced Filters (Collapsible) */}
      <div className="border-teal-200 rounded-lg bg-white/95 shadow-sm">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 hover:bg-teal-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium text-teal-900">Advanced Filters</span>
          </div>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 pt-0 space-y-4 border-t border-teal-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Origin */}
              <div className="space-y-2">
                <Label htmlFor="origin">Origin City</Label>
                <Input
                  id="origin"
                  placeholder="Filter by origin..."
                  value={filters.origin || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      origin: e.target.value || undefined,
                    })
                  }
                />
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label htmlFor="destination">Destination City</Label>
                <Input
                  id="destination"
                  placeholder="Filter by destination..."
                  value={filters.destination || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      destination: e.target.value || undefined,
                    })
                  }
                />
              </div>

              {/* Owner */}
              <div className="space-y-2">
                <Label htmlFor="owner">Owner</Label>
                {isMounted ? (
                  <Select
                    value={filters.owner || 'all'}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        owner: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger id="owner">
                      <SelectValue placeholder="All owners" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      {owners.map((owner) => (
                        <SelectItem key={owner} value={owner}>
                          {owner}
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

              {/* Service Level */}
              <div className="space-y-2">
                <Label htmlFor="serviceLevel">Service Level</Label>
                {isMounted ? (
                  <Select
                    value={filters.serviceLevel || 'all'}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        serviceLevel: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger id="serviceLevel">
                      <SelectValue placeholder="All service levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Service Levels</SelectItem>
                      {serviceLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
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

              {/* Risk Factor */}
              <div className="space-y-2">
                <Label htmlFor="riskFactor">Risk Factor</Label>
                {isMounted ? (
                  <Select
                    value={filters.riskFactor || 'all'}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        riskFactor: value === 'all' ? undefined : (value as RiskFactorFilter),
                      })
                    }
                  >
                    <SelectTrigger id="riskFactor">
                      <SelectValue placeholder="All risk factors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk Factors</SelectItem>
                      {ALL_RISK_FACTORS.map((factor) => (
                        <SelectItem key={factor} value={factor}>
                          {getRiskFactorLabel(factor)}
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

            </div>

            {/* Risk Score Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minRiskScore">Min Risk Score</Label>
                <Input
                  id="minRiskScore"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={filters.minRiskScore ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      minRiskScore: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRiskScore">Max Risk Score</Label>
                <Input
                  id="maxRiskScore"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={filters.maxRiskScore ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      maxRiskScore: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                />
              </div>
            </div>

            {/* Days to ETA Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minDaysToEta">Min Days to ETA</Label>
                <Input
                  id="minDaysToEta"
                  type="number"
                  placeholder="Any"
                  value={filters.minDaysToEta ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      minDaysToEta: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDaysToEta">Max Days to ETA</Label>
                <Input
                  id="maxDaysToEta"
                  type="number"
                  placeholder="Any"
                  value={filters.maxDaysToEta ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      maxDaysToEta: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
