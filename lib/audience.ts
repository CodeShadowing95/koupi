// Votes des visiteurs et mesure d'audience anonyme (copies, ouvertures de lien, recherches sans résultat).
// Rien ne permet de reconnaître un visiteur : on ajoute 1 à un total du jour, c'est tout.
import { and, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, dailyCounters, tools, COUNTER_METRICS } from '@/db/schema';

export type Metric = typeof COUNTER_METRICS[number];
export function isMetric(value: unknown): value is Metric { return (COUNTER_METRICS as readonly unknown[]).includes(value); }

const DAY = 86_400_000;
export function dayOf(date: Date): string { return date.toISOString().slice(0, 10); }

/** Recherche ramenée à une forme simple pour être comptée : minuscules, espaces réduits, 60 caractères au plus. */
export function normalizeQuery(query: string): string {
  return query.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** Ajoute 1 au total du jour pour cette mesure et cette clé. */
export async function bumpCounter(db: Db, metric: Metric, key: string, now = new Date()): Promise<void> {
  if (!key || key.length > 80) return;
  await db.insert(dailyCounters).values({ day: dayOf(now), metric, key, count: 1 })
    .onConflictDoUpdate({ target: [dailyCounters.day, dailyCounters.metric, dailyCounters.key], set: { count: sql`${dailyCounters.count} + 1` } });
}

/** Vrai si le code existe, n'est pas archivé et est visible sur le site (on ne compte rien d'autre). */
export async function isPublicCode(db: Db, id: string): Promise<boolean> {
  const [row] = await db.select({ id: codes.id }).from(codes)
    .where(and(eq(codes.id, id), isNull(codes.archivedAt), inArray(codes.status, ['verified', 'to_test']))).limit(1);
  return Boolean(row);
}

/** Vote « ça a marché » ou « ça n'a pas marché ». Renvoie false si le code n'est pas public. */
export async function recordVote(db: Db, id: string, worked: boolean): Promise<{ up: number; down: number } | null> {
  if (!(await isPublicCode(db, id))) return null;
  const [row] = await db.update(codes)
    .set(worked ? { votesUp: sql`${codes.votesUp} + 1` } : { votesDown: sql`${codes.votesDown} + 1` })
    .where(eq(codes.id, id)).returning({ up: codes.votesUp, down: codes.votesDown });
  return row ?? null;
}

export const AUDIENCE_PERIODS = [7, 30, 90] as const;
export type AudiencePeriod = typeof AUDIENCE_PERIODS[number];
export function isAudiencePeriod(value: number): value is AudiencePeriod { return (AUDIENCE_PERIODS as readonly number[]).includes(value); }

export type Audience = {
  period: AudiencePeriod;
  totals: { copies: number; opens: number; emptySearches: number };
  daily: { day: string; copies: number; opens: number }[];
  topCodes: { code: string; tool: string; copies: number }[];
  topTools: { tool: string; opens: number }[];
  emptySearches: { query: string; count: number }[];
};

export async function audienceStats(db: Db, period: AudiencePeriod, now = new Date()): Promise<Audience> {
  const first = dayOf(new Date(now.getTime() - (period - 1) * DAY));
  const rows = await db.select().from(dailyCounters).where(gte(dailyCounters.day, first));

  const days = Array.from({ length: period }, (_, i) => dayOf(new Date(now.getTime() - (period - 1 - i) * DAY)));
  const daily = days.map(day => ({ day, copies: 0, opens: 0 }));
  const index = new Map(days.map((day, i) => [day, i]));
  const byCode = new Map<string, { copies: number; opens: number }>();
  const searches = new Map<string, number>();
  for (const row of rows) {
    const i = index.get(row.day);
    if (row.metric === 'search_empty') { searches.set(row.key, (searches.get(row.key) ?? 0) + row.count); continue; }
    const current = byCode.get(row.key) ?? { copies: 0, opens: 0 };
    if (row.metric === 'copy') { current.copies += row.count; if (i !== undefined) daily[i].copies += row.count; }
    else { current.opens += row.count; if (i !== undefined) daily[i].opens += row.count; }
    byCode.set(row.key, current);
  }

  const ids = [...byCode.keys()].filter(id => /^[0-9a-f-]{36}$/i.test(id));
  const names = ids.length
    ? await db.select({ id: codes.id, code: codes.code, tool: tools.name }).from(codes).innerJoin(tools, eq(codes.toolId, tools.id)).where(inArray(codes.id, ids))
    : [];
  const topCodes = names.map(row => ({ code: row.code, tool: row.tool, copies: byCode.get(row.id)?.copies ?? 0 }))
    .filter(row => row.copies > 0).sort((a, b) => b.copies - a.copies).slice(0, 8);
  const opensByTool = new Map<string, number>();
  for (const row of names) opensByTool.set(row.tool, (opensByTool.get(row.tool) ?? 0) + (byCode.get(row.id)?.opens ?? 0));
  const topTools = [...opensByTool].map(([tool, opens]) => ({ tool, opens })).filter(row => row.opens > 0).sort((a, b) => b.opens - a.opens).slice(0, 8);
  const emptySearches = [...searches].map(([query, count]) => ({ query, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  return {
    period,
    totals: {
      copies: daily.reduce((sum, day) => sum + day.copies, 0),
      opens: daily.reduce((sum, day) => sum + day.opens, 0),
      emptySearches: [...searches.values()].reduce((sum, count) => sum + count, 0),
    },
    daily, topCodes, topTools, emptySearches,
  };
}
