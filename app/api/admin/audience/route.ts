import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session';
import { audienceStats, isAudiencePeriod } from '@/lib/audience';

// Audience anonyme sur 7, 30 ou 90 jours : copies, liens ouverts, recherches sans résultat.
export async function GET(request: NextRequest) {
  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const period = Number(request.nextUrl.searchParams.get('period') ?? '30');
  if (!isAudiencePeriod(period)) return NextResponse.json({ error: 'Période invalide.' }, { status: 400 });
  try {
    return NextResponse.json(await audienceStats(getDb(), period));
  } catch (error) {
    console.error('audience read failed', error);
    return NextResponse.json({ error: 'Impossible de charger l’audience.' }, { status: 500 });
  }
}
