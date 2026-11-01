import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session';
import { adminInsights, isPeriod } from '@/lib/admin-insights';

// Indicateurs de modération pour l'accueil et la page Statistiques du back-office.
export async function GET(request: NextRequest) {
  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const period = Number(request.nextUrl.searchParams.get('period') || '30');
  if (!isPeriod(period)) return NextResponse.json({ error: 'Période invalide.' }, { status: 400 });
  try {
    return NextResponse.json(await adminInsights(getDb(), period));
  } catch (error) {
    console.error('admin insights failed', error);
    return NextResponse.json({ error: 'Impossible de charger les indicateurs.' }, { status: 500 });
  }
}
