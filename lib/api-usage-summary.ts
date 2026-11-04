// Ce que montre la page Consommation : le quota YouTube du jour et la dépense IA du mois.
import type { Db } from '@/db';
import { aiConfigFrom, aiStatusOf } from './ai-extract';
import { aiSpendByDay, serviceUsage, type ServiceUsage } from './api-usage';
import { startOfMonthUtc } from './verification-store';

export type AiUsageSummary = {
  active: boolean; spentUsdMicros: number; budgetUsdMicros: number;
  /** Chaque jour du mois en cours (UTC), les jours à venir à zéro : le graphique garde la même largeur tout le mois. */
  days: { day: string; usdMicros: number }[];
};
export type UsageSummary = { services: ServiceUsage[]; ai: AiUsageSummary };

export async function usageSummary(db: Db, env: Record<string, string | undefined> = process.env, now = new Date()): Promise<UsageSummary> {
  const config = aiConfigFrom(env);
  const since = startOfMonthUtc(now);
  const [services, byDay] = await Promise.all([serviceUsage(db, now), aiSpendByDay(db, since)]);
  const days: AiUsageSummary['days'] = [];
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  for (let at = new Date(since); at.getTime() < end; at = new Date(at.getTime() + 86_400_000)) {
    const day = at.toISOString().slice(0, 10);
    days.push({ day, usdMicros: byDay[day] ?? 0 });
  }
  const spent = days.reduce((total, item) => total + item.usdMicros, 0);
  return {
    services,
    ai: { active: aiStatusOf(config, spent).state !== 'inactive', spentUsdMicros: spent, budgetUsdMicros: config.monthlyBudgetUsdMicros, days },
  };
}
