// Ce que montrent la page Consommation et la jauge du menu : le quota YouTube du jour et la dépense IA du mois.
import type { Db } from '@/db';
import { aiConfigFrom, aiStatusOf } from './ai-extract';
import { aiSpendByDay, serviceUsage, usageLevel, usageRatio, type ServiceUsage } from './api-usage';
import { startOfMonthUtc } from './verification-store';
import { formatEur } from './verification-display';

export type AiUsageSummary = {
  active: boolean; spentUsdMicros: number; budgetUsdMicros: number; usdPerEur: number;
  /** Chaque jour du mois en cours (UTC), les jours à venir à zéro : le graphique garde la même largeur tout le mois. */
  days: { day: string; usdMicros: number }[];
};
export type UsageSummary = { services: ServiceUsage[]; ai: AiUsageSummary };
/** Version courte pour la jauge du menu. */
export type UsageGauge = { key: string; label: string; ratio: number; level: 'ok' | 'warn' | 'bad'; detail: string };

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
    ai: { active: aiStatusOf(config, spent).state !== 'inactive', spentUsdMicros: spent, budgetUsdMicros: config.monthlyBudgetUsdMicros, usdPerEur: config.usdPerEur, days },
  };
}

const percent = (ratio: number) => `${Math.round(ratio * 100)} %`;

export function usageGauges(summary: UsageSummary): UsageGauge[] {
  const services = summary.services.map(service => {
    const ratio = usageRatio(service.today, service.dailyLimit);
    return { key: service.service, label: service.service === 'youtube' ? 'YouTube' : service.label, ratio, level: usageLevel(ratio), detail: `${service.today.toLocaleString('fr-FR')} / ${service.dailyLimit.toLocaleString('fr-FR')} unités aujourd’hui (${percent(ratio)})` };
  });
  const ratio = usageRatio(summary.ai.spentUsdMicros, summary.ai.budgetUsdMicros);
  const ai = { key: 'ai', label: 'IA', ratio, level: usageLevel(ratio), detail: summary.ai.active ? `${formatEur(summary.ai.spentUsdMicros, summary.ai.usdPerEur)} sur ${formatEur(summary.ai.budgetUsdMicros, summary.ai.usdPerEur)} ce mois-ci (${percent(ratio)})` : 'IA en attente d’activation' };
  return [...services, ai];
}
