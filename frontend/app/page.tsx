import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold">LogiDog</CardTitle>
          <CardDescription className="text-lg mt-2">
            Shipment Delay Predictor & Alert System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Proactively identify shipments at risk of delay and take corrective actions before
            problems become critical.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/alerts">View Alerts Dashboard</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-primary">Real-time</div>
              <div className="text-sm text-muted-foreground mt-1">Live Updates</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-primary">Early</div>
              <div className="text-sm text-muted-foreground mt-1">Risk Detection</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-primary">Actionable</div>
              <div className="text-sm text-muted-foreground mt-1">Insights</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
