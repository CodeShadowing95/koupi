import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { updateFeedback } from '@/lib/feedback';
import { readJsonBody } from '@/lib/http';

// Marquer un avis comme lu, traité ou nouveau, avec une note facultative.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Avis invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 2_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await updateFeedback(getDb(), id, parsed.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Avis introuvable.' ? 404 : 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('feedback update failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce changement.' }, { status: 500 });
  }
}
