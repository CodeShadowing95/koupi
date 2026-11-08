// Merkod Studio : le tableau de bord du créateur connecté (espace créateur, ADR-0021).
// Fonctions pures pour l'affichage (courbe des 30 jours, tendance, objectif rosette) et une requête des copies par jour.
import { and, eq, gte, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, creatorAccounts, dailyCounters, type CreatorAccountRow } from '@/db/schema';
import { cleanMetrics } from './account-metrics';
import { MIN_RATINGS, MIN_SUBSCRIBERS } from './verification';
import { accountLevelOf } from './creator-level';
import { PLATFORM_LABELS, type CreatorPlatform } from './creator-accounts-display';

export const STUDIO_DAYS = 30;

const dayOf = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

/** Les N derniers jours (aujourd'hui compris), du plus ancien au plus récent, avec 0 les jours sans copie. */
export function fillDays(rows: { day: string; count: number }[], now: Date, days = STUDIO_DAYS): { day: string; count: number }[] {
  const byDay = new Map(rows.map(row => [row.day, row.count]));
  return Array.from({ length: days }, (_, index) => {
    const day = dayOf(addDays(now, index - days + 1));
    return { day, count: byDay.get(day) ?? 0 };
  });
}

/** Les 7 derniers jours contre les 7 d'avant. null s'il n'y avait rien avant (pas de pourcentage à inventer). */
export function weekTrend(series: { count: number }[]): { last: number; previous: number; change: number | null } {
  const sum = (items: { count: number }[]) => items.reduce((total, item) => total + item.count, 0);
  const last = sum(series.slice(-7));
  const previous = sum(series.slice(-14, -7));
  return { last, previous, change: previous > 0 ? Math.round(((last - previous) / previous) * 100) : null };
}

/** « Bonjour », « Bon après-midi » ou « Bonsoir » selon l'heure de Paris. */
export function greeting(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Paris' }).formatToParts(now);
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? 12);
  return hour >= 18 || hour < 5 ? 'Bonsoir' : hour >= 12 ? 'Bon après-midi' : 'Bonjour';
}

export type RosetteGoal = {
  reached: boolean;
  /** Le compte qui en est le plus près, null si aucun compte n'a d'audience connue. */
  best: { platform: CreatorPlatform; label: string; handle: string; value: number; target: number; unit: 'abonnés' | 'notes'; proven: boolean } | null;
  remaining: number;
  percent: number;
};

/**
 * Où en est le créateur de la rosette « Créateur vérifié » : un compte prouvé par la bio et au-dessus du seuil
 * (1 000 abonnés, ou 50 notes pour un podcast). On montre le compte le plus avancé vers le seuil.
 */
export function rosetteGoal(accounts: (Pick<CreatorAccountRow, 'platform' | 'handle' | 'subscribers' | 'claimStatus' | 'platformVerified' | 'adminCheckedAt'> & { metrics?: unknown })[]): RosetteGoal {
  const reached = accounts.some(account => accountLevelOf(account) === 'verified');
  const scored = accounts.flatMap(account => {
    const ratings = cleanMetrics(account.metrics).ratingCount;
    const podcast = account.platform === 'podcast';
    const value = podcast ? ratings ?? null : account.subscribers;
    if (value === null || value === undefined) return [];
    const target = podcast ? MIN_RATINGS : MIN_SUBSCRIBERS;
    return [{ platform: account.platform, label: PLATFORM_LABELS[account.platform], handle: account.handle, value, target, unit: podcast ? 'notes' as const : 'abonnés' as const, proven: account.claimStatus === 'verified', ratio: value / target }];
  }).sort((a, b) => Number(b.proven) - Number(a.proven) || b.ratio - a.ratio);
  const top = scored[0];
  if (!top) return { reached, best: null, remaining: 0, percent: reached ? 100 : 0 };
  const { ratio: _ratio, ...best } = top;
  void _ratio;
  return { reached, best, remaining: Math.max(0, best.target - best.value), percent: reached ? 100 : Math.min(100, Math.round((best.value / best.target) * 100)) };
}

/** Copies de tous ses codes, jour par jour, sur les N derniers jours. */
export async function copiesPerDay(db: Db, creatorId: string, now = new Date(), days = STUDIO_DAYS): Promise<{ day: string; count: number }[]> {
  const rows = await db.select({ day: dailyCounters.day, count: sql<number>`sum(${dailyCounters.count})::int` })
    .from(dailyCounters)
    .innerJoin(codes, sql`${dailyCounters.key} = ${codes.id}::text`)
    .where(and(eq(codes.creatorId, creatorId), eq(dailyCounters.metric, 'copy'), gte(dailyCounters.day, dayOf(addDays(now, -days + 1)))))
    .groupBy(dailyCounters.day);
  return fillDays(rows.map(row => ({ day: String(row.day), count: row.count })), now, days);
}

export async function studioAccounts(db: Db, creatorId: string) {
  return db.select().from(creatorAccounts).where(eq(creatorAccounts.creatorId, creatorId));
}
