import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const featureTiles = [
  {
    title: 'Real-time',
    description: 'Live Updates',
    wrapperClass: 'bg-teal-50/80 border-teal-200 text-teal-900',
    badgeBg: 'bg-teal-100 text-teal-700',
    badgeLabel: 'Live',
  },
  {
    title: 'Early',
    description: 'Risk Detection',
    wrapperClass: 'bg-teal-50/80 border-teal-200 text-teal-900',
    badgeBg: 'bg-teal-100 text-teal-700',
    badgeLabel: 'AI',
  },
  {
    title: 'Actionable',
    description: 'Insights',
    wrapperClass: 'bg-teal-50/80 border-teal-200 text-teal-900',
    badgeBg: 'bg-teal-100 text-teal-700',
    badgeLabel: 'Smart',
  },
] as const

export function HomePage() {
  return (
    <div className="relative flex flex-1 items-center justify-center px-4 py-16 bg-gradient-to-br from-teal-50 via-[#E6FFFA] to-teal-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_60%)]"
        aria-hidden="true"
      />
      <Card className="relative w-full max-w-2xl border-slate-200 bg-white/95 text-slate-900 shadow-xl backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold">
            <span className="text-[#14B8A6]">Logi</span>
            <span className="text-[#0F766E]">Dog</span>
          </CardTitle>
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
            <Button asChild size="lg" className="bg-[#0F766E] hover:bg-[#0D9488] text-white">
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

