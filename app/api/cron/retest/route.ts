import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { safeEqual } from '@/lib/admin-session';
import { applePodcasts } from '@/lib/apple-podcasts';
import { linkCreatorAccounts } from '@/lib/creator-account-link';
import { youtubeBatch } from '@/lib/creator-youtube-link';
import { runRetests } from '@/lib/retest';
import { purgeAuditLog } from '@/lib/site-settings';
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
    // Les créateurs arrivés par l'import de data/ n'ont pas de compte relié : on relie chaîne YouTube et podcast la nuit.
    const accounts = await linkCreatorAccounts(getDb(), { youtube: youtubeBatch(process.env.YOUTUBE_API_KEY), podcasts: applePodcasts() })
      .catch(error => { console.error('cron accounts link failed', error); return null; });
    // Le journal de l'administration ne garde que 12 mois.
    const journalPurged = await purgeAuditLog(getDb()).catch(error => { console.error('cron audit purge failed', error); return 0; });
    return NextResponse.json({ ok: true, ...report, accountsLinked: accounts?.linked.length ?? 0, journalPurged });
  } catch (error) {
    console.error('cron retest failed', error);
    return NextResponse.json({ error: 'Retests impossibles pour le moment.' }, { status: 500 });
  }
}
