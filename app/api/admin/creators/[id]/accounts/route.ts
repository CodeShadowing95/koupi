import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { addCreatorAccount, youtubeChannelReader } from '@/lib/creator-accounts';
import { readJsonBody } from '@/lib/http';
import { revalidateCatalog } from '@/lib/catalog-server';

// Relie un compte (chaîne YouTube, TikTok…) à un créateur.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Créateur invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 2_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await addCreatorAccount(getDb(), id, parsed.data, { readChannel: youtubeChannelReader(process.env.YOUTUBE_API_KEY) });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Créateur introuvable.' ? 404 : 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true, id: result.data.id });
  } catch (error) {
    console.error('creator account create failed', error);
    return NextResponse.json({ error: 'Impossible de relier ce compte.' }, { status: 500 });
  }
}
