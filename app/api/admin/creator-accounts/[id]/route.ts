import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { deleteCreatorAccount, updateCreatorAccount } from '@/lib/creator-accounts';
import { readJsonBody } from '@/lib/http';
import { revalidateCatalog } from '@/lib/catalog-server';

type Context = { params: Promise<{ id: string }> };

// Badge certifié, contrôle par l'admin, abonnés saisis à la main.
export async function PATCH(request: NextRequest, { params }: Context) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Compte invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 1_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await updateCreatorAccount(getDb(), id, parsed.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Compte introuvable.' ? 404 : 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('creator account update failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce changement.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Compte invalide.' }, { status: 400 });
  try {
    const deleted = await deleteCreatorAccount(getDb(), id);
    if (deleted) revalidateCatalog();
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
  } catch (error) {
    console.error('creator account delete failed', error);
    return NextResponse.json({ error: 'Impossible de retirer ce compte.' }, { status: 500 });
  }
}
