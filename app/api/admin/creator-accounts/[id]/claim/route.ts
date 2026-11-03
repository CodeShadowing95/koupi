import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { isClaimAction, runClaimAction, youtubeDescriptionReader } from '@/lib/creator-claim';
import { readJsonBody } from '@/lib/http';
import { revalidateCatalog } from '@/lib/catalog-server';

// Preuve par la bio (ADR-0020) : donner un code, lire la bio YouTube, confirmer, annuler ou retirer.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Compte invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 500);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const action = parsed.data.action;
    if (!isClaimAction(action)) return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
    const result = await runClaimAction(getDb(), id, action, { readDescription: youtubeDescriptionReader(process.env.YOUTUBE_API_KEY) });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Compte introuvable.' ? 404 : 400 });
    if (result.data.status !== 'pending') revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('creator account claim failed', error);
    return NextResponse.json({ error: 'Impossible de mener cette étape.' }, { status: 500 });
  }
}
