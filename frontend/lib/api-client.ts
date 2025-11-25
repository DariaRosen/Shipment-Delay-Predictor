import { AlertShipment, AlertsResponse, AlertsFilters } from '@/types/alerts'

// Always use relative paths for Next.js API routes (same project)
// The backend has been migrated to Next.js API routes, so we always use '/api'
const API_BASE_URL = '/api'

// Log API URL in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL)
}

export const apiClient = {
  async getAlerts(filters?: AlertsFilters): Promise<AlertsResponse> {
    const params = new URLSearchParams()
    if (filters?.severity) params.append('severity', filters.severity)
    if (filters?.mode) params.append('mode', filters.mode)
    if (filters?.carrier) params.append('carrier', filters.carrier)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.origin) params.append('origin', filters.origin)
    if (filters?.destination) params.append('destination', filters.destination)
    if (filters?.owner) params.append('owner', filters.owner)
    if (filters?.serviceLevel) params.append('serviceLevel', filters.serviceLevel)
    if (filters?.riskFactor) params.append('riskFactor', filters.riskFactor)
    if (filters?.minRiskScore !== undefined) params.append('minRiskScore', String(filters.minRiskScore))
    if (filters?.maxRiskScore !== undefined) params.append('maxRiskScore', String(filters.maxRiskScore))
    if (filters?.minDaysToEta !== undefined) params.append('minDaysToEta', String(filters.minDaysToEta))
    if (filters?.maxDaysToEta !== undefined) params.append('maxDaysToEta', String(filters.maxDaysToEta))

    const url = `${API_BASE_URL}/alerts?${params.toString()}`
    console.log('Fetching alerts from:', url)
    
    const response = await fetch(url)
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch alerts:', response.status, errorText)
      throw new Error(`Failed to fetch alerts: ${response.status} ${errorText}`)
    }
    return response.json()
  },

  async getAlert(shipmentId: string): Promise<AlertShipment> {
    const response = await fetch(`${API_BASE_URL}/alerts/${shipmentId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch alert')
    }
    return response.json()
  },

  async getShipment(shipmentId: string): Promise<AlertShipment> {
    const response = await fetch(`${API_BASE_URL}/alerts/${shipmentId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch shipment')
    }
    return response.json()
  },

  async acknowledgeAlert(shipmentId: string, userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/alerts/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentId, userId }),
    })
    if (!response.ok) {
      throw new Error('Failed to acknowledge alert')
    }
  },

  async getShipments(filters?: {
    year?: number
    month?: number
    status?: 'all' | 'completed' | 'in_progress' | 'canceled' | 'future'
    search?: string
  }): Promise<AlertsResponse> {
    const params = new URLSearchParams()
    if (filters?.year) params.append('year', String(filters.year))
    if (filters?.month) params.append('month', String(filters.month))
    if (filters?.status) params.append('status', filters.status)
    if (filters?.search) params.append('search', filters.search)

    const response = await fetch(`${API_BASE_URL}/alerts/shipments/all?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch shipments')
    }
    return response.json()
  },
}

