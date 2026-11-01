import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { renameCategory } from '@/lib/catalog-admin';
import { revalidateCatalog } from '@/lib/catalog-server';
import { readJsonBody } from '@/lib/http';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { slug } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return NextResponse.json({ error: 'Catégorie invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 1_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await renameCategory(getDb(), slug, parsed.data.name);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Catégorie introuvable.' ? 404 : 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('category update failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce changement.' }, { status: 500 });
  }
}
