import { getSupabaseClient } from '@/lib/supabase'
import { calculateShipmentAlert } from '@/lib/api/calculate-shipment-alert'
import type { AlertShipment } from '@/types/alerts'

/**
 * Calculate and store alert data in the database.
 * This ensures both API routes read from the same source.
 */
export async function updateShipmentAlertCalculations(shipmentIds?: string[]) {
  const supabase = getSupabaseClient()

  try {
    // Fetch shipments to calculate
    let query = supabase.from('shipments').select('*')
    if (shipmentIds && shipmentIds.length > 0) {
      query = query.in('shipment_id', shipmentIds)
    }

    const { data: shipments, error: shipmentsError } = await query

    if (shipmentsError || !shipments) {
      throw new Error(`Failed to fetch shipments: ${shipmentsError?.message || 'Unknown error'}`)
    }

    if (shipments.length === 0) {
      return { updated: 0 }
    }

    // Fetch all events for these shipments
    const shipmentIdsToFetch = shipments.map((s: any) => s.shipment_id)
    const { data: allEvents } = await supabase
      .from('shipment_events')
      .select('*')
      .in('shipment_id', shipmentIdsToFetch)
      .order('event_time', { ascending: true })

    // Group events by shipment
    const eventsByShipment = new Map<string, any[]>()
    ;(allEvents || []).forEach((e: any) => {
      if (!eventsByShipment.has(e.shipment_id)) {
        eventsByShipment.set(e.shipment_id, [])
      }
      eventsByShipment.get(e.shipment_id)!.push({
        event_time: e.event_time,
        event_stage: e.event_stage,
        description: e.description,
        location: e.location,
      })
    })

    // Calculate alerts and update database
    let updated = 0
    for (const shipment of shipments) {
      const s = shipment as any
      const events = eventsByShipment.get(s.shipment_id) || []

      // Calculate alert using shared function
      const calculatedAlert = calculateShipmentAlert(s, events)

      // Update shipment with calculated data
      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          calculated_risk_score: calculatedAlert.riskScore,
          calculated_severity: calculatedAlert.severity,
          calculated_risk_reasons: calculatedAlert.riskReasons,
          calculated_risk_factor_points: calculatedAlert.riskFactorPoints || [],
          calculated_status: calculatedAlert.status || 'in_progress',
          calculated_current_stage: calculatedAlert.currentStage,
          calculated_days_to_eta: calculatedAlert.daysToEta,
          calculated_at: new Date().toISOString(),
        })
        .eq('shipment_id', s.shipment_id)

      if (updateError) {
        console.error(`Failed to update alert data for ${s.shipment_id}:`, updateError)
      } else {
        updated++
      }
    }

    return { updated }
  } catch (error) {
    console.error('Error updating alert calculations:', error)
    throw error
  }
}


