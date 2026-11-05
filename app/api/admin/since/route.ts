import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { parseSince, sinceVisit } from '@/lib/admin-since';

// Ce qui est arrivé depuis la dernière visite de l'accueil (?at=<date ISO>, gardée dans le navigateur).
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const since = parseSince(request.nextUrl.searchParams.get('at'));
  if (!since) return NextResponse.json({ error: 'Date invalide.' }, { status: 400 });
  try {
    return NextResponse.json({ since: since.toISOString(), ...(await sinceVisit(getDb(), since)) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('since visit read failed', error);
    return NextResponse.json({ error: 'Impossible de lire les nouveautés.' }, { status: 500 });
  }
}
