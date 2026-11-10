import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { aiConfigFrom, anthropicCreate } from '@/lib/ai-extract';
import { youtubeChannelReader } from '@/lib/creator-accounts';
import { findCreatorNetworks } from '@/lib/creator-networks-ai';

// Quelques recherches web de l’IA : souvent 20 à 40 secondes.
export const maxDuration = 120;

// « ✦ Trouver ses réseaux » : propose les autres comptes publics d'un créateur. Rien n'est enregistré.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Créateur invalide.' }, { status: 400 });
  try {
    const config = aiConfigFrom(process.env);
    const result = await findCreatorNetworks(getDb(), {
      ai: { config, create: config.apiKey ? anthropicCreate(config.apiKey) : null },
      readChannel: youtubeChannelReader(process.env.YOUTUBE_API_KEY),
    }, id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Créateur introuvable.' ? 404 : 400 });
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('creator networks search failed', error);
    return NextResponse.json({ error: 'Recherche impossible pour le moment.' }, { status: 500 });
  }
}
