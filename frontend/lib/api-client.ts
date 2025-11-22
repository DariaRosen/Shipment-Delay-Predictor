import { AlertShipment, AlertsResponse, AlertsFilters } from '@/types/alerts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const apiClient = {
  async getAlerts(filters?: AlertsFilters): Promise<AlertsResponse> {
    const params = new URLSearchParams()
    if (filters?.severity) params.append('severity', filters.severity)
    if (filters?.mode) params.append('mode', filters.mode)
    if (filters?.carrier) params.append('carrier', filters.carrier)
    if (filters?.search) params.append('search', filters.search)

    const response = await fetch(`${API_BASE_URL}/alerts?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch alerts')
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
    status?: 'all' | 'completed' | 'incomplete'
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

