// Annuaire des créateurs (page /creators) et compteur « codes copiés ce mois-ci ».
// Les copies viennent des compteurs anonymes (ADR-0010) : un total par code et par jour, rien sur le visiteur.
import { and, eq, gte, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, creatorAccounts, creators, dailyCounters } from '@/db/schema';
import type { CreatorPlatform } from './creator-accounts-display';
import { creatorCategories } from './creator-profile';
import { isPublic, type Code, type Tool } from './data';

/** Premier jour du mois en cours (UTC, comme les compteurs du jour), au format AAAA-MM-JJ. */
export function monthStart(now = new Date()): string {
  return `${now.toISOString().slice(0, 7)}-01`;
}

/** Copies de ses codes depuis le début du mois, par créateur (id). Un créateur sans copie n'apparaît pas. */
export async function copiesThisMonth(db: Db, now = new Date()): Promise<Map<string, number>> {
  const rows = await db.select({ creatorId: codes.creatorId, copies: sql<number>`sum(${dailyCounters.count})::int` })
    .from(dailyCounters)
    .innerJoin(codes, sql`${dailyCounters.key} = ${codes.id}::text`)
    .where(and(eq(dailyCounters.metric, 'copy'), gte(dailyCounters.day, monthStart(now))))
    .groupBy(codes.creatorId);
  return new Map(rows.map(row => [row.creatorId, row.copies]));
}

export type CreatorFacts = { slug: string; bio: string | null; platforms: CreatorPlatform[]; copies: number };

/** Ce que la base sait de chaque créateur en plus du catalogue : présentation, réseaux, copies du mois. Clé : slug. */
export async function loadCreatorFacts(db: Db, now = new Date()): Promise<Record<string, CreatorFacts>> {
  const [creatorRows, accountRows, copies] = await Promise.all([
    db.select({ id: creators.id, slug: creators.slug, bio: creators.bio }).from(creators),
    db.select({ creatorId: creatorAccounts.creatorId, platform: creatorAccounts.platform }).from(creatorAccounts),
    copiesThisMonth(db, now),
  ]);
  const facts: Record<string, CreatorFacts> = {};
  for (const row of creatorRows) {
    const platforms = [...new Set(accountRows.filter(account => account.creatorId === row.id).map(account => account.platform))];
    facts[row.slug] = { slug: row.slug, bio: row.bio, platforms, copies: copies.get(row.id) ?? 0 };
  }
  return facts;
}

export type DirectoryEntry = {
  slug: string; name: string; level: Code['creatorLevel']; bio: string | null;
  codes: number; tools: string[]; themes: string[]; platforms: CreatorPlatform[]; copies: number;
};

/** Créateurs qui ont au moins un code visible, le plus copié ce mois-ci d'abord, puis le plus de codes. */
export function buildDirectory(catalog: { codes: Code[]; tools: Tool[] }, facts: Record<string, CreatorFacts>): DirectoryEntry[] {
  const bySlug = new Map<string, Code[]>();
  for (const code of catalog.codes) if (isPublic(code)) bySlug.set(code.creatorSlug, [...(bySlug.get(code.creatorSlug) ?? []), code]);
  return [...bySlug].map(([slug, own]) => {
    const fact = facts[slug];
    return {
      slug, name: own[0].creator, level: own.find(code => code.creatorLevel)?.creatorLevel, bio: fact?.bio ?? null,
      codes: own.length, tools: [...new Set(own.map(code => code.tool))], themes: creatorCategories(own, catalog.tools),
      platforms: fact?.platforms ?? [], copies: fact?.copies ?? 0,
    };
  }).sort((a, b) => b.copies - a.copies || b.codes - a.codes || a.name.localeCompare(b.name, 'fr'));
}

export type DirectoryFilter = { platform?: string; theme?: string };

export function filterDirectory(entries: DirectoryEntry[], filter: DirectoryFilter): DirectoryEntry[] {
  return entries.filter(entry =>
    (!filter.platform || entry.platforms.includes(filter.platform as CreatorPlatform))
    && (!filter.theme || entry.themes.includes(filter.theme)));
}

/** Choix proposés dans les filtres : seulement les réseaux et thèmes présents, du plus fréquent au moins fréquent. */
export function directoryOptions(entries: DirectoryEntry[]): { platforms: CreatorPlatform[]; themes: string[] } {
  const rank = <T extends string>(values: T[]) => {
    const count = new Map<T, number>();
    for (const value of values) count.set(value, (count.get(value) ?? 0) + 1);
    return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')).map(([value]) => value);
  };
  return { platforms: rank(entries.flatMap(entry => entry.platforms)), themes: rank(entries.flatMap(entry => entry.themes)) };
}
