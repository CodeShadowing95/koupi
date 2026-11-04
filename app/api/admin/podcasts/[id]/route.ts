import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { setPodcastActive, unfollowPodcast } from '@/lib/podcasts-admin';

type Context = { params: Promise<{ id: string }> };

// Met en pause ou reprend la lecture d'un podcast suivi.
export async function PATCH(request: NextRequest, { params }: Context) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Podcast invalide.' }, { status: 400 });
  const parsed = await readJsonBody(request, 200);
  if (!parsed.ok || typeof parsed.data.active !== 'boolean') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  try {
    return await setPodcastActive(getDb(), id, parsed.data.active) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Podcast introuvable.' }, { status: 404 });
  } catch (error) {
    console.error('podcast update failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce changement.' }, { status: 500 });
  }
}

// Arrête de suivre un podcast (son créateur et ses codes restent).
export async function DELETE(request: NextRequest, { params }: Context) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Podcast invalide.' }, { status: 400 });
  try {
    return await unfollowPodcast(getDb(), id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Podcast introuvable.' }, { status: 404 });
  } catch (error) {
    console.error('podcast delete failed', error);
    return NextResponse.json({ error: 'Impossible de retirer ce podcast.' }, { status: 500 });
  }
}
