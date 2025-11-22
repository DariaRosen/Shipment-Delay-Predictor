'use client'

import { useParams } from 'next/navigation'
import { ShipmentDetailPage } from './shipment-detail-page'

export default function ShipmentDetailPageRoute() {
  const params = useParams()
  const shipmentId = params.shipmentId as string

  return <ShipmentDetailPage shipmentId={shipmentId} />
}

