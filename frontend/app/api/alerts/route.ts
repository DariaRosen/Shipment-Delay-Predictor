import { NextRequest, NextResponse } from 'next/server';
import { fetchAndCalculateAlerts } from '@/lib/api/alerts-route-logic';
import type { AlertsResponse, AlertsFilters } from '@/types/alerts';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters: AlertsFilters = {
      severity: searchParams.get('severity') as any,
      mode: searchParams.get('mode') as any,
      carrier: searchParams.get('carrier') || undefined,
      search: searchParams.get('search') || undefined,
      origin: searchParams.get('origin') || undefined,
      destination: searchParams.get('destination') || undefined,
      owner: searchParams.get('owner') || undefined,
      serviceLevel: searchParams.get('serviceLevel') || undefined,
      riskFactor: searchParams.get('riskFactor') as any,
      minRiskScore: searchParams.get('minRiskScore') ? parseInt(searchParams.get('minRiskScore')!, 10) : undefined,
      maxRiskScore: searchParams.get('maxRiskScore') ? parseInt(searchParams.get('maxRiskScore')!, 10) : undefined,
      minDaysToEta: searchParams.get('minDaysToEta') ? parseInt(searchParams.get('minDaysToEta')!, 10) : undefined,
      maxDaysToEta: searchParams.get('maxDaysToEta') ? parseInt(searchParams.get('maxDaysToEta')!, 10) : undefined,
      acknowledged: searchParams.get('acknowledged') === 'true' ? true : searchParams.get('acknowledged') === 'false' ? false : undefined,
    };

    // Use SHARED logic function - same as detail route
    // This ensures 100% consistency between both endpoints
    const allAlerts = await fetchAndCalculateAlerts(filters);

    // Filter results (alerts route only shows in_progress shipments with risk)
    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, Minimal: 0 };
    const alerts: typeof allAlerts = [];

    for (const calculatedAlert of allAlerts) {
      // Count all calculated severities (before filtering)
      severityCounts[calculatedAlert.severity]++;

      // Only include shipments that are in_progress (not completed, canceled, or future)
      // Only in-progress shipments can be at risk
      if (calculatedAlert.status !== 'in_progress') {
        continue;
      }

      // Only include shipments with risk factors (riskReasons or riskScore > 0)
      if (calculatedAlert.riskReasons.length === 0 && calculatedAlert.riskScore === 0) {
        continue;
      }

      // Apply severity filter after calculation
      if (filters.severity && calculatedAlert.severity !== filters.severity) {
        continue;
      }

      alerts.push(calculatedAlert);
    }

    // Log severity distribution for debugging
    console.log('Severity distribution (calculated):', severityCounts);
    console.log('Severity distribution (included in alerts):', {
      Critical: alerts.filter(a => a.severity === 'Critical').length,
      High: alerts.filter(a => a.severity === 'High').length,
      Medium: alerts.filter(a => a.severity === 'Medium').length,
      Low: alerts.filter(a => a.severity === 'Low').length,
      Minimal: alerts.filter(a => a.severity === 'Minimal').length,
    });

    const response: AlertsResponse = {
      data: alerts,
      meta: {
        lastUpdated: new Date().toISOString(),
        count: alerts.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

