import { getDb } from '@/db';
import { aiConfigFrom, aiStatusOf } from '@/lib/ai-extract';
import { verificationQueue } from '@/lib/verification-queue';
import { aiSpendSince, startOfMonthUtc } from '@/lib/verification-store';
import { VerificationsView } from './verifications-view';

export const dynamic = 'force-dynamic';

// File des codes à décider, avec leur dernière analyse, l'état de l'IA et la dépense du mois.
export default async function Page() {
  const db = getDb();
  const config = aiConfigFrom(process.env);
  const [queue, spent] = await Promise.all([verificationQueue(db), aiSpendSince(db, startOfMonthUtc())]);
  return (
    <VerificationsView
      queue={queue}
      ai={{ status: aiStatusOf(config, spent), spentUsdMicros: spent, budgetUsdMicros: config.monthlyBudgetUsdMicros, model: config.model, reviewModel: config.reviewModel }}
      youtubeReady={Boolean(process.env.YOUTUBE_API_KEY)}
    />
  );
}
