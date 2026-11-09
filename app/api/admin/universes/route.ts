import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { revalidateCatalog } from '@/lib/catalog-server';
import { readJsonBody } from '@/lib/http';
import { logAdminAction } from '@/lib/site-settings';
import { setUniverseVisible } from '@/lib/universes-admin';

// Allume ou éteint un univers sur le site : { slug, visible } (ADR-0046).
export async function PATCH(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 500);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const db = getDb();
    const result = await setUniverseVisible(db, parsed.data.slug, parsed.data.visible);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(db, result.data.visible ? 'universe_on' : 'universe_off', result.data.name);
    revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('universe switch failed', error);
    return NextResponse.json({ error: 'Le changement n’a pas pu être enregistré.' }, { status: 500 });
  }
}
