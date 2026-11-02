import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { safeEqual } from '@/lib/admin-session';
import { linkYoutubeChannels, youtubeBatch } from '@/lib/creator-youtube-link';
import { runRetests } from '@/lib/retest';
import { verificationDeps } from '@/lib/verification-deps';

// Jusqu'à 40 codes relus par nuit : on laisse le temps aux lectures YouTube et à l'IA.
export const maxDuration = 300;

// Tâche planifiée Vercel (vercel.json, « crons »). Vercel envoie « Authorization: Bearer <CRON_SECRET> ».
// Sans CRON_SECRET configuré, la tâche est désactivée : personne ne peut la déclencher.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Retests désactivés : CRON_SECRET manquant.' }, { status: 503 });
  if (!safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const report = await runRetests(getDb(), verificationDeps());
    // Les créateurs arrivés par l'import de data/ n'ont pas de chaîne reliée : on la relie la nuit.
    const youtube = youtubeBatch(process.env.YOUTUBE_API_KEY);
    const channels = youtube ? await linkYoutubeChannels(getDb(), youtube).catch(error => { console.error('cron channel link failed', error); return null; }) : null;
    return NextResponse.json({ ok: true, ...report, channelsLinked: channels?.linked.length ?? 0 });
  } catch (error) {
    console.error('cron retest failed', error);
    return NextResponse.json({ error: 'Retests impossibles pour le moment.' }, { status: 500 });
  }
}
