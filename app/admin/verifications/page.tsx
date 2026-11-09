import { getDb } from '@/db';
import { aiConfigFrom, aiStatusOf } from '@/lib/ai-extract';
import { verificationQueue } from '@/lib/verification-queue';
import { toolOptions } from '@/lib/codes-admin';
import { aiSpendSince, startOfMonthUtc } from '@/lib/verification-store';
import { VerificationsView } from './verifications-view';

export const metadata = { title: 'Vérifications · Admin Merkod' };

export const dynamic = 'force-dynamic';

// File des codes à décider, avec leur dernière analyse, l'état de l'IA et la dépense du mois.
export default async function Page() {
  const db = getDb();
  const config = aiConfigFrom(process.env);
  const [queue, spent, tools] = await Promise.all([verificationQueue(db), aiSpendSince(db, startOfMonthUtc()), toolOptions(db)]);
  return (
    <VerificationsView
      queue={queue}
      ai={{ status: aiStatusOf(config, spent), spentUsdMicros: spent, budgetUsdMicros: config.monthlyBudgetUsdMicros, usdPerEur: config.usdPerEur, model: config.model, reviewModel: config.reviewModel }}
      youtubeReady={Boolean(process.env.YOUTUBE_API_KEY)}
      tools={tools.map(({ slug, name }) => ({ slug, name }))}
    />
  );
}
