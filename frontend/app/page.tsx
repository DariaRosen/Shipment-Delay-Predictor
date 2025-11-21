import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const featureTiles = [
  {
    title: 'Real-time',
    description: 'Live Updates',
    wrapperClass: 'bg-blue-50/80 border-blue-200 text-blue-900',
    badgeBg: 'bg-blue-100 text-blue-700',
    badgeLabel: 'Live',
  },
  {
    title: 'Early',
    description: 'Risk Detection',
    wrapperClass: 'bg-slate-50/80 border-slate-200 text-slate-900',
    badgeBg: 'bg-slate-100 text-slate-700',
    badgeLabel: 'AI',
  },
  {
    title: 'Actionable',
    description: 'Insights',
    wrapperClass: 'bg-indigo-50/80 border-indigo-200 text-indigo-900',
    badgeBg: 'bg-indigo-100 text-indigo-700',
    badgeLabel: 'Smart',
  },
] as const

export default function Home() {
  return (
    <div className="relative flex flex-1 items-center justify-center px-4 py-16 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_60%)]"
        aria-hidden="true"
      />
      <Card className="relative w-full max-w-2xl border-slate-200 bg-white/95 text-slate-900 shadow-xl backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-slate-900">LogiDog</CardTitle>
          <CardDescription className="text-lg mt-2 text-slate-600">
            Shipment Delay Predictor & Alert System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-slate-600">
            Proactively identify shipments at risk of delay and take corrective actions before
            problems become critical.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 text-white">
              <Link href="/alerts">View Alerts Dashboard</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {featureTiles.map((tile) => (
              <div
                key={tile.title}
                className={`rounded-lg border p-4 text-center ${tile.wrapperClass}`}
              >
                <span
                  className={`mb-2 inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${tile.badgeBg}`}
                >
                  {tile.badgeLabel}
                </span>
                <div className="text-2xl font-bold mt-2">{tile.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{tile.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
