import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { searchCategoryCodes, youtubeSearch } from '@/lib/category-code-search';
import { verificationDeps } from '@/lib/verification-deps';

// Jusqu'à 20 recherches YouTube, puis l'analyse de chaque code trouvé : on laisse du temps.
export const maxDuration = 300;

// Cherche sur YouTube des codes pour les catégories vides, ou pour une seule catégorie ({ slug }). Rien n'est publié.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const parsed = await readJsonBody(request, 200);
  if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
  const slug = parsed.data.slug;
  if (slug !== undefined && (typeof slug !== 'string' || slug.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))) return NextResponse.json({ error: 'Catégorie invalide.' }, { status: 400 });
  const youtube = youtubeSearch(process.env.YOUTUBE_API_KEY);
  if (!youtube) return NextResponse.json({ error: 'La clé YouTube manque : ajoute YOUTUBE_API_KEY dans les réglages Vercel.' }, { status: 503 });
  try {
    const report = await searchCategoryCodes(getDb(), youtube, { categorySlug: slug, deps: verificationDeps() });
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error('category code search failed', error);
    return NextResponse.json({ error: 'Recherche impossible pour le moment.' }, { status: 500 });
  }
}
