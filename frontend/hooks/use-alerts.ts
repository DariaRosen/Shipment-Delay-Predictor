import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { AlertsFilters } from '@/types/alerts'

export const useAlerts = (filters?: AlertsFilters) => {
  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => apiClient.getAlerts(filters),
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  })
}

export const useAlert = (shipmentId: string) => {
  return useQuery({
    queryKey: ['alert', shipmentId],
    queryFn: () => apiClient.getAlert(shipmentId),
    enabled: !!shipmentId,
  })
}

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shipmentId, userId }: { shipmentId: string; userId: string }) =>
      apiClient.acknowledgeAlert(shipmentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

