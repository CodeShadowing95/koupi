import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { revalidateCatalog } from '@/lib/catalog-server';
import { readJsonBody } from '@/lib/http';
import { logAdminAction } from '@/lib/site-settings';
import { moveToolsToUniverses } from '@/lib/universes-admin';

// Range les marques cochées dans leur univers : { moves: [{ toolId, universe }] }.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 60_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const db = getDb();
    const result = await moveToolsToUniverses(db, parsed.data.moves);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    if (result.data.moved > 0) await logAdminAction(db, 'universe_sorted', `${result.data.moved} marque${result.data.moved > 1 ? 's' : ''}`);
    revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('universe move failed', error);
    return NextResponse.json({ error: 'Le rangement n’a pas pu être enregistré.' }, { status: 500 });
  }
}
