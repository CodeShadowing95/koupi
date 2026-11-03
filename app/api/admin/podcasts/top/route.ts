import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-guard';
import { applePodcasts, TOP_GENRES } from '@/lib/apple-podcasts';

// Classement Apple Podcasts d'un des genres proposés, pour découvrir des podcasts à suivre.
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const genre = Number(request.nextUrl.searchParams.get('genre'));
  if (!TOP_GENRES.some(item => item.id === genre)) return NextResponse.json({ error: 'Genre inconnu.' }, { status: 400 });
  try {
    return NextResponse.json({ feeds: await applePodcasts().top!(genre, 50) });
  } catch (error) {
    console.error('podcast top failed', error);
    return NextResponse.json({ error: 'Apple Podcasts ne répond pas. Réessaie dans un moment.' }, { status: 502 });
  }
}
