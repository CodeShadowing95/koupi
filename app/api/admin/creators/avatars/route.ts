import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { revalidateCatalog } from '@/lib/catalog-server';
import { youtubeBatch } from '@/lib/creator-youtube-link';
import { refreshCreatorAvatars } from '@/lib/stored-images';

export const maxDuration = 60;

// Photos des créateurs depuis leur chaîne YouTube reliée.
// Avec creatorId : actualise la photo de ce créateur. Sans : récupère celles qui manquent.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const youtube = youtubeBatch(process.env.YOUTUBE_API_KEY);
  if (!youtube) return NextResponse.json({ error: 'Ajoute YOUTUBE_API_KEY dans les réglages Vercel pour récupérer les photos.' }, { status: 503 });
  const parsed = await readJsonBody(request, 2_000);
  const creatorId = parsed.ok && typeof parsed.data.creatorId === 'string' ? parsed.data.creatorId : '';
  if (creatorId && !/^[0-9a-f-]{36}$/i.test(creatorId)) return NextResponse.json({ error: 'Créateur inconnu.' }, { status: 400 });
  try {
    const report = await refreshCreatorAvatars(getDb(), youtube, creatorId ? { onlyCreatorId: creatorId } : { missingOnly: true });
    if (report.updated.length) revalidateCatalog();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error('creator avatars refresh failed', error);
    return NextResponse.json({ error: 'YouTube ne répond pas. Réessaie dans un moment.' }, { status: 502 });
  }
}
