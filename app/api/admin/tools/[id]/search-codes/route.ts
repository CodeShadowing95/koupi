import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { searchCategoryCodes, youtubeSearch } from '@/lib/category-code-search';
import { verificationDeps } from '@/lib/verification-deps';

// Une recherche YouTube, puis l'analyse de chaque code trouvé.
export const maxDuration = 120;

// Cherche sur YouTube des codes pour un seul outil (« <outil> code promo »). Rien n'est publié : les codes vont dans Vérifications.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Outil invalide.' }, { status: 400 });
  const youtube = youtubeSearch(process.env.YOUTUBE_API_KEY);
  if (!youtube) return NextResponse.json({ error: 'La clé YouTube manque : ajoute YOUTUBE_API_KEY dans les réglages Vercel.' }, { status: 503 });
  try {
    const report = await searchCategoryCodes(getDb(), youtube, { toolId: id, deps: verificationDeps() });
    if (report.tools === 0) return NextResponse.json({ error: 'Outil introuvable ou archivé.' }, { status: 404 });
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error('tool code search failed', error);
    return NextResponse.json({ error: 'Recherche impossible pour le moment.' }, { status: 500 });
  }
}
