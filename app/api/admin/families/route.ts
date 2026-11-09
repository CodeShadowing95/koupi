import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { createFamily } from '@/lib/catalog-admin';
import { revalidateCatalog } from '@/lib/catalog-server';
import { readJsonBody } from '@/lib/http';
import { setFamilyUniverse } from '@/lib/universes-admin';

// Nouvelle famille de catégories : { name } → { slug, name }. Une famille du même nom est réutilisée.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 1_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await createFamily(getDb(), parsed.data.name);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('family creation failed', error);
    return NextResponse.json({ error: 'Impossible de créer cette famille.' }, { status: 500 });
  }
}

// Range une famille dans un univers : { slug, universe } (ADR-0046). Ses catégories et ses outils suivent.
export async function PATCH(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 500);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await setFamilyUniverse(getDb(), parsed.data.slug, parsed.data.universe);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('family universe failed', error);
    return NextResponse.json({ error: 'Le changement n’a pas pu être enregistré.' }, { status: 500 });
  }
}
