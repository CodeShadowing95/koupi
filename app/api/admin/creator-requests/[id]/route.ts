import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { updateCreatorRequest } from '@/lib/creator-requests';
import { readJsonBody } from '@/lib/http';

// Traiter, écarter ou rouvrir une demande venue de la page d'un créateur.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Demande invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 2_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await updateCreatorRequest(getDb(), id, parsed.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Demande introuvable.' ? 404 : 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('creator request update failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce changement.' }, { status: 500 });
  }
}
