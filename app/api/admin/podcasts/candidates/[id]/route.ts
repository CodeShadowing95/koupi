import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { setCandidateStatus } from '@/lib/podcast-candidates';

type Context = { params: Promise<{ id: string }> };

// Écarte un podcast candidat (Podcasts > Candidats) ou le remet dans la liste. Le suivre passe par /api/admin/podcasts.
export async function PATCH(request: NextRequest, { params }: Context) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Candidat invalide.' }, { status: 400 });
  const parsed = await readJsonBody(request, 200);
  const status = parsed.ok ? parsed.data.status : null;
  if (status !== 'new' && status !== 'dismissed') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  try {
    return await setCandidateStatus(getDb(), id, status) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Candidat introuvable.' }, { status: 404 });
  } catch (error) {
    console.error('podcast candidate update failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce changement.' }, { status: 500 });
  }
}
