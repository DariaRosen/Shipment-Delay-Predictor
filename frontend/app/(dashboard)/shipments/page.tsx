import { Suspense } from 'react'
import ShipmentsPage from './shipments-page'

export default function ShipmentsPageRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShipmentsPage />
    </Suspense>
  )
}

