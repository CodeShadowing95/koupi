import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-guard';
import { applePodcasts } from '@/lib/apple-podcasts';

// Recherche d'un podcast dans l'annuaire Apple Podcasts, pour choisir lequel suivre.
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const term = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 120);
  if (term.length < 2) return NextResponse.json({ error: 'Tape au moins deux lettres.' }, { status: 400 });
  try {
    return NextResponse.json({ feeds: await applePodcasts().search(term) });
  } catch (error) {
    console.error('podcast search failed', error);
    return NextResponse.json({ error: 'Apple Podcasts ne répond pas. Réessaie dans un moment.' }, { status: 502 });
  }
}
