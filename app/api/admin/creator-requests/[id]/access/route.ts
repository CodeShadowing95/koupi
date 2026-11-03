import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { grantCreatorAccess, revokeCreatorAccess } from '@/lib/creator-auth';

// Donne (ou retire) à l'e-mail d'une revendication l'accès à l'espace de la page du créateur.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Demande invalide.' }, { status: 400 });
  try {
    const body = await readJsonBody(request, 500);
    if (!body.ok || typeof body.data.grant !== 'boolean') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    const db = getDb();
    const result = body.data.grant ? await grantCreatorAccess(db, id) : await revokeCreatorAccess(db, id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Demande introuvable.' ? 404 : 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('creator access update failed', error);
    return NextResponse.json({ error: 'Impossible de changer cet accès.' }, { status: 500 });
  }
}
