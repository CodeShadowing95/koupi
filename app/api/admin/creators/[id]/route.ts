import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { updateCreatorProfile } from '@/lib/catalog-admin';
import { deleteCreator } from '@/lib/creator-delete';
import { revalidateCatalog } from '@/lib/catalog-server';
import { readJsonBody } from '@/lib/http';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Créateur invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 4_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await updateCreatorProfile(getDb(), id, { name: parsed.data.name, bio: parsed.data.bio });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Créateur introuvable.' ? 404 : 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('creator update failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce changement.' }, { status: 500 });
  }
}

/** Supprime le créateur et tout ce qui le concerne (ADR-0048), quand il demande à ne plus figurer sur Merkod. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Créateur invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 1_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await deleteCreator(getDb(), id, parsed.data.confirmName);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Créateur introuvable.' ? 404 : 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true, codes: result.data.codes });
  } catch (error) {
    console.error('creator delete failed', error);
    return NextResponse.json({ error: 'La suppression n’a pas abouti. Réessaie : elle reprend là où elle s’est arrêtée.' }, { status: 500 });
  }
}
