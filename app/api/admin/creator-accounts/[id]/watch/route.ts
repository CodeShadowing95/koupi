import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { setChannelWatch } from '@/lib/youtube-channel-read';

// « Suivre ses vidéos » sur le compte YouTube d'un créateur : { follow: true } suit la chaîne, false la met en pause.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Compte invalide.' }, { status: 400 });
  const parsed = await readJsonBody(request, 200);
  if (!parsed.ok || typeof parsed.data.follow !== 'boolean') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  try {
    const result = await setChannelWatch(getDb(), id, parsed.data.follow);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Compte introuvable.' ? 404 : 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('channel watch failed', error);
    return NextResponse.json({ error: 'Impossible de changer le suivi de cette chaîne.' }, { status: 500 });
  }
}
