'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

export function ShipmentSearch() {
  const [shipmentId, setShipmentId] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (shipmentId.trim()) {
      router.push(`/shipment/${shipmentId.trim()}`)
      setShipmentId('')
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="Enter Shipment ID..."
        value={shipmentId}
        onChange={(e) => setShipmentId(e.target.value)}
        className="w-48 h-9"
      />
      <Button
        type="submit"
        size="sm"
        className="bg-[#0F766E] hover:bg-[#0D9488] text-white"
      >
        <Search className="h-4 w-4" />
      </Button>
    </form>
  )
}

