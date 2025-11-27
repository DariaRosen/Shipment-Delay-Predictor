const acknowledgements = new Map<
  string,
  {
    userId: string
    timestamp: string
  }
>()

export function setAcknowledged(shipmentId: string, userId: string) {
  acknowledgements.set(shipmentId, { userId, timestamp: new Date().toISOString() })
}

export function getAcknowledgement(shipmentId: string) {
  return acknowledgements.get(shipmentId)
}

export function clearAcknowledgements() {
  acknowledgements.clear()
}


