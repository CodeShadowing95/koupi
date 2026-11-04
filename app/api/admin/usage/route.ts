import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { usageSummary } from '@/lib/api-usage-summary';

// Consommation des API (ADR-0028), la même que la page Consommation.
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    return NextResponse.json(await usageSummary(getDb()), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('api usage read failed', error);
    return NextResponse.json({ error: 'Impossible de lire la consommation.' }, { status: 500 });
  }
}
