// Annuaire des créateurs (utilisé par la recherche) et compteur « codes copiés ce mois-ci ».
// Les copies viennent des compteurs anonymes (ADR-0010) : un total par code et par jour, rien sur le visiteur.
import { and, eq, gte, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, creatorAccounts, creators, dailyCounters } from '@/db/schema';
import { usedCode } from './audience';
import type { CreatorPlatform } from './creator-accounts-display';
import { creatorCategories } from './creator-profile';
import { isPublic, type Code, type Tool } from './data';
import { offerScore, type DirectoryEntry } from './creator-directory-filter';
import { isTrusted } from './tool-page';
import { sourcePlatform } from './source-platform';

export * from './creator-directory-filter';

/** Premier jour du mois en cours (UTC, comme les compteurs du jour), au format AAAA-MM-JJ. */
export function monthStart(now = new Date()): string {
  return `${now.toISOString().slice(0, 7)}-01`;
}

/** Copies de ses codes depuis le début du mois, par créateur (id). Un créateur sans copie n'apparaît pas. */
export async function copiesThisMonth(db: Db, now = new Date()): Promise<Map<string, number>> {
  const rows = await db.select({ creatorId: codes.creatorId, copies: sql<number>`sum(${dailyCounters.count})::int` })
    .from(dailyCounters)
    .innerJoin(codes, sql`${dailyCounters.key} = ${codes.id}::text`)
    .where(and(usedCode, gte(dailyCounters.day, monthStart(now))))
    .groupBy(codes.creatorId);
  return new Map(rows.map(row => [row.creatorId, row.copies]));
}

/** Copies de chaque code depuis le début du mois (clé : id du code). Un code sans copie n'apparaît pas. */
export async function copiesByCodeThisMonth(db: Db, now = new Date()): Promise<Map<string, number>> {
  const rows = await db.select({ key: dailyCounters.key, copies: sql<number>`sum(${dailyCounters.count})::int` })
    .from(dailyCounters)
    .innerJoin(codes, sql`${dailyCounters.key} = ${codes.id}::text`)
    .where(and(usedCode, gte(dailyCounters.day, monthStart(now))))
    .groupBy(dailyCounters.key);
  return new Map(rows.map(row => [row.key, row.copies]));
}

/** Copies des codes de chaque outil depuis le début du mois (clé : id de l'outil). */
export async function copiesByToolThisMonth(db: Db, now = new Date()): Promise<Map<string, number>> {
  const rows = await db.select({ toolId: codes.toolId, copies: sql<number>`sum(${dailyCounters.count})::int` })
    .from(dailyCounters)
    .innerJoin(codes, sql`${dailyCounters.key} = ${codes.id}::text`)
    .where(and(usedCode, gte(dailyCounters.day, monthStart(now))))
    .groupBy(codes.toolId);
  return new Map(rows.map(row => [row.toolId, row.copies]));
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

/** Ses codes, le meilleur d'abord : un code recommandable avant les autres, puis la plus forte offre, puis la réussite. */
function rankCodes(own: Code[]): Code[] {
  return [...own].sort((a, b) => (isTrusted(a) ? 0 : 1) - (isTrusted(b) ? 0 : 1) || offerScore(b.discount) - offerScore(a.discount) || b.success - a.success);
}

/** Créateurs qui ont au moins un code visible, le plus copié ce mois-ci d'abord, puis le plus de codes. */
export function buildDirectory(catalog: { codes: Code[]; tools: Tool[] }, facts: Record<string, CreatorFacts>): DirectoryEntry[] {
  const bySlug = new Map<string, Code[]>();
  for (const code of catalog.codes) if (isPublic(code)) bySlug.set(code.creatorSlug, [...(bySlug.get(code.creatorSlug) ?? []), code]);
  const toolOf = new Map(catalog.tools.map(tool => [tool.slug, tool]));
  return [...bySlug].map(([slug, unranked]) => {
    const fact = facts[slug];
    const own = rankCodes(unranked);
    // Le code à copier d'un clic : un vrai code d'abord, une offre par lien seulement s'il n'a que ça (ADR-0040).
    const best = own.find(code => code.code) ?? own[0];
    const logos = [...new Map(own.map(code => [code.toolSlug, { slug: code.toolSlug, name: code.tool }])).values()];
    // Ses réseaux : ses comptes reliés, et à défaut ceux d'où viennent ses codes (une vidéo YouTube, un post Instagram…).
    const fromSources = own.map(code => sourcePlatform(code.source)).filter((platform): platform is CreatorPlatform => Boolean(platform) && platform !== 'other');
    const platforms = [...new Set([...(fact?.platforms ?? []), ...fromSources])];
    const families = [...new Set(own.map(code => toolOf.get(code.toolSlug)?.family).filter((family): family is string => Boolean(family)))];
    return {
      slug, name: own[0].creator, level: own.find(code => code.creatorLevel)?.creatorLevel, bio: fact?.bio ?? null,
      codes: own.length, tools: [...new Set(own.map(code => code.tool))], themes: creatorCategories(own, catalog.tools),
      platforms, copies: fact?.copies ?? 0, families, logos,
      top: {
        id: best.id, code: best.code, tool: best.tool, toolSlug: best.toolSlug, creator: best.creator, discount: best.discount,
        link: best.creatorLink || toolOf.get(best.toolSlug)?.website || '#',
      },
    };
  }).sort((a, b) => b.copies - a.copies || b.codes - a.codes || a.name.localeCompare(b.name, 'fr'));
}

