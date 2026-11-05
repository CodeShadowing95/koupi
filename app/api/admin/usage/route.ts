import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { usageGauges, usageSummary } from '@/lib/api-usage-summary';

// Consommation des API (ADR-0028). ?gauge=1 : la version courte de la jauge du menu.
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const summary = await usageSummary(getDb());
    const body = request.nextUrl.searchParams.get('gauge') === '1' ? { gauges: usageGauges(summary) } : summary;
    return NextResponse.json(body, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('api usage read failed', error);
    return NextResponse.json({ error: 'Impossible de lire la consommation.' }, { status: 500 });
  }
}
