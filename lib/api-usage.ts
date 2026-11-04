// Consommation des API externes, comptée par Merkod (ADR-0028) : YouTube ne dit pas combien de quota est utilisé,
// alors chaque appel est noté dans api_usage, par service et par jour de quota. L'IA, elle, a déjà son coût
// enregistré à chaque appel (ai_usage, verification_checks, tool_suggestions) : on le relit tel quel.
import { and, gte, isNotNull, sql } from 'drizzle-orm';
import { getDb, type Db } from '@/db';
import { aiUsage, apiUsage, toolSuggestions, verificationChecks } from '@/db/schema';

/** Les services comptés. Ajouter Spotify, Podcast Index… ici : la page Consommation les affiche d'elle-même. */
export const API_SERVICES = {
  youtube: {
    label: 'YouTube Data API',
    /** Quota gratuit par jour, en unités. */
    dailyLimit: 10_000,
    /** Le jour de quota change à minuit heure du Pacifique (vers 9 h à Paris). */
    timeZone: 'America/Los_Angeles',
  },
} as const;
export type ApiService = keyof typeof API_SERVICES;

/** Date AAAA-MM-JJ d'un instant dans un fuseau. */
function dateIn(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** Décalage du fuseau par rapport à UTC à cet instant, en minutes (-420 pour Los Angeles en été). */
function offsetMinutes(timeZone: string, at: Date): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).map(part => [part.type, part.value]));
  const local = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return Math.round((local - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}

/** Jour de quota du service à cet instant. */
export function quotaDay(service: ApiService, now = new Date()): string {
  return dateIn(API_SERVICES[service].timeZone, now);
}

/** Prochaine remise à zéro du quota : minuit suivant dans le fuseau du service. */
export function nextQuotaReset(service: ApiService, now = new Date()): Date {
  const { timeZone } = API_SERVICES[service];
  const [year, month, day] = dateIn(timeZone, now).split('-').map(Number);
  const midnightUtc = Date.UTC(year, month - 1, day + 1);
  // Le décalage pris juste avant minuit local reste juste même un jour de changement d'heure (le changement a lieu à 2 h).
  return new Date(midnightUtc - offsetMinutes(timeZone, new Date(midnightUtc - 12 * 3_600_000)) * 60_000);
}

/** Coût d'un appel YouTube en unités : 100 pour une recherche, 1 pour une lecture (vidéos, chaînes, playlists). */
export function youtubeUnits(url: string): number {
  const endpoint = /\/youtube\/v3\/([a-zA-Z]+)/.exec(url)?.[1] ?? '';
  return endpoint === 'search' ? 100 : 1;
}

/** Note un appel : ajoute ses unités au jour de quota du service. */
export async function recordApiUsage(db: Db, service: ApiService, units: number, now = new Date()): Promise<void> {
  await db.insert(apiUsage).values({ service, day: quotaDay(service, now), units, calls: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: [apiUsage.service, apiUsage.day],
      set: { units: sql`${apiUsage.units} + ${units}`, calls: sql`${apiUsage.calls} + 1`, updatedAt: now },
    });
}

type Recorder = (service: ApiService, units: number) => Promise<void>;

/** En production, l'appel est noté dans la base du déploiement. Sans base (tests, scripts), rien n'est noté. */
const recordInDb: Recorder = async (service, units) => {
  if (!process.env.DATABASE_URL) return;
  await recordApiUsage(getDb(), service, units);
};

/**
 * fetch qui compte chaque appel à l'API YouTube. Compté même en erreur : YouTube décompte aussi les requêtes refusées.
 * Un comptage qui échoue ne casse jamais l'appel.
 */
export function countedYoutubeFetch(record: Recorder = recordInDb, fetchFn: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const response = await fetchFn(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    await record('youtube', youtubeUnits(url)).catch(error => console.error('api usage record failed', error));
    return response;
  };
}

/** Le fetch par défaut des lecteurs YouTube de Merkod. */
export const youtubeFetch: typeof fetch = countedYoutubeFetch();

export type UsageDay = { day: string; units: number };
export type ServiceUsage = {
  service: ApiService; label: string; dailyLimit: number;
  today: number; calls: number; resetAt: string;
  /** Les 30 derniers jours de quota, du plus ancien au plus récent, jours sans appel compris. */
  days: UsageDay[];
};

/** Les n derniers jours (AAAA-MM-JJ) jusqu'à `last` compris. */
function lastDays(last: string, n: number): string[] {
  const [year, month, day] = last.split('-').map(Number);
  return Array.from({ length: n }, (_, index) => new Date(Date.UTC(year, month - 1, day - (n - 1 - index))).toISOString().slice(0, 10));
}

/** Consommation de chaque service compté : aujourd'hui et les 30 derniers jours. */
export async function serviceUsage(db: Db, now = new Date()): Promise<ServiceUsage[]> {
  const services = Object.keys(API_SERVICES) as ApiService[];
  const oldest = new Date(now.getTime() - 31 * 86_400_000).toISOString().slice(0, 10);
  const rows = await db.select().from(apiUsage).where(gte(apiUsage.day, oldest));
  return services.map(service => {
    const today = quotaDay(service, now);
    const mine = new Map(rows.filter(row => row.service === service).map(row => [row.day, row]));
    return {
      service, label: API_SERVICES[service].label, dailyLimit: API_SERVICES[service].dailyLimit,
      today: mine.get(today)?.units ?? 0, calls: mine.get(today)?.calls ?? 0,
      resetAt: nextQuotaReset(service, now).toISOString(),
      days: lastDays(today, 30).map(day => ({ day, units: mine.get(day)?.units ?? 0 })),
    };
  });
}

/** Dépense de l'IA par jour (UTC) depuis une date, en millionièmes de dollar, toutes sources confondues. */
export async function aiSpendByDay(db: Db, since: Date): Promise<Record<string, number>> {
  const day = (column: unknown) => sql<string>`to_char(${column} at time zone 'UTC', 'YYYY-MM-DD')`;
  const [checks, tools, other] = await Promise.all([
    db.select({ day: day(verificationChecks.createdAt), total: sql<string>`sum(${verificationChecks.costUsdMicros})` })
      .from(verificationChecks).where(gte(verificationChecks.createdAt, since)).groupBy(day(verificationChecks.createdAt)),
    db.select({ day: day(toolSuggestions.analyzedAt), total: sql<string>`sum(${toolSuggestions.analysisCostUsdMicros})` })
      .from(toolSuggestions).where(and(isNotNull(toolSuggestions.analyzedAt), gte(toolSuggestions.analyzedAt, since))).groupBy(day(toolSuggestions.analyzedAt)),
    db.select({ day: day(aiUsage.createdAt), total: sql<string>`sum(${aiUsage.costUsdMicros})` })
      .from(aiUsage).where(gte(aiUsage.createdAt, since)).groupBy(day(aiUsage.createdAt)),
  ]);
  const byDay: Record<string, number> = {};
  for (const row of [...checks, ...tools, ...other]) byDay[row.day] = (byDay[row.day] ?? 0) + Number(row.total ?? 0);
  return byDay;
}

/** Part utilisée, de 0 à 1 (bornée). */
export function usageRatio(used: number, limit: number): number {
  return limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
}

/** Niveau d'alerte d'une jauge : ok sous 70 %, attention jusqu'à 90 %, critique au-delà. */
export function usageLevel(ratio: number): 'ok' | 'warn' | 'bad' {
  return ratio >= 0.9 ? 'bad' : ratio >= 0.7 ? 'warn' : 'ok';
}
