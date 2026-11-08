import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { reviewSubmittedCode } from '@/lib/creator-self-proof';
import { revalidateCatalog } from '@/lib/catalog-server';

// Codes posés sur un réseau que Merkod ne lit pas (ADR-0041) : l'admin dit s'il a vu le code sur le profil.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Code invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 200);
    if (!parsed.ok || typeof parsed.data.seen !== 'boolean') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    const result = await reviewSubmittedCode(getDb(), id, parsed.data.seen);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    if (result.data.proven) revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('claim code review failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce constat.' }, { status: 500 });
  }
}
