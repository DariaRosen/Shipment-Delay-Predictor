'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Package } from 'lucide-react'

export default function ShipmentPage() {
  const router = useRouter()
  const [shipmentId, setShipmentId] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (shipmentId.trim()) {
      router.push(`/shipment/${shipmentId.trim()}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-[#E6FFFA] to-teal-100">
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-teal-200 bg-white/95">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-teal-600" />
                <CardTitle className="text-3xl text-teal-900">Shipment Tracker</CardTitle>
              </div>
              <p className="text-muted-foreground mt-2">
                Enter a shipment ID to view detailed tracking information and timeline
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="shipment-id" className="text-sm font-medium text-teal-900">
                    Shipment ID
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="shipment-id"
                      type="text"
                      placeholder="e.g., LD1001"
                      value={shipmentId}
                      onChange={(e) => setShipmentId(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      className="bg-[#0F766E] hover:bg-[#0D9488] text-white"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Track
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can also click on any shipment in the Alerts table to view its details.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

