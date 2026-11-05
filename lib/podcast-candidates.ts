// Podcasts candidats en base (ADR-0036) : ce que le script hebdomadaire envoie, et ce que l'admin en fait.
// Un candidat déjà suivi n'est jamais montré : le suivre passe par le même chemin qu'une recherche Apple.
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { podcastCandidates, tools, watchedSources, type PodcastCandidateHit } from '@/db/schema';
import { domainOf, type CatalogTool } from './podcast-codes';
import type { CandidateInput } from './podcast-index';

export type CandidateStatus = 'new' | 'dismissed';
export type AdminCandidate = {
  id: string; itunesId: string; title: string; author: string; imageUrl: string | null; language: string; category: string;
  episodeCount: number; newestEpisodeAt: string | null; status: CandidateStatus; firstSeenAt: string; lastSeenAt: string;
  hits: (PodcastCandidateHit & { toolName: string })[];
};

/** Identifiants Apple des podcasts déjà suivis (actifs ou en pause). */
async function followedIds(db: Db): Promise<Set<string>> {
  const rows = await db.select({ id: watchedSources.externalId }).from(watchedSources).where(eq(watchedSources.platform, 'podcast'));
  return new Set(rows.map(row => row.id));
}

/** Ce dont le script a besoin : les outils du catalogue (nom et domaine) et les podcasts déjà suivis, à ne pas relire. */
export async function scriptCatalog(db: Db): Promise<{ tools: CatalogTool[]; followed: string[] }> {
  const rows = await db.select({ id: tools.id, name: tools.name, website: tools.website }).from(tools).where(isNull(tools.archivedAt));
  return { tools: rows.map(tool => ({ id: tool.id, name: tool.name, domain: domainOf(tool.website) })), followed: [...await followedIds(db)] };
}

/** Identifiants des outils du catalogue, pour relire les codes envoyés. */
export async function catalogToolIds(db: Db): Promise<Set<string>> {
  return new Set((await db.select({ id: tools.id }).from(tools).where(isNull(tools.archivedAt))).map(row => row.id));
}

/**
 * Enregistre les candidats d'un passage. Un podcast déjà suivi est ignoré. Un candidat déjà connu garde son état
 * (un podcast écarté reste écarté) et prend les nouveaux chiffres et codes.
 */
export async function saveCandidates(db: Db, list: CandidateInput[], now = new Date()): Promise<{ saved: number; followed: number }> {
  const followed = await followedIds(db);
  const fresh = list.filter(item => !followed.has(item.itunesId));
  for (const item of fresh) {
    const values = {
      podcastIndexId: item.podcastIndexId, title: item.title, author: item.author, feedUrl: item.feedUrl, imageUrl: item.imageUrl,
      language: item.language, category: item.category, episodeCount: item.episodeCount,
      newestEpisodeAt: item.newestEpisodeAt ? new Date(item.newestEpisodeAt) : null, hits: item.hits, lastSeenAt: now,
    };
    await db.insert(podcastCandidates).values({ itunesId: item.itunesId, ...values, firstSeenAt: now })
      .onConflictDoUpdate({ target: podcastCandidates.itunesId, set: values });
  }
  return { saved: fresh.length, followed: list.length - fresh.length };
}

/** Candidats pas encore suivis, ceux qui citent le plus d'outils d'abord, puis les plus actifs. */
export async function listCandidates(db: Db, limit = 300): Promise<AdminCandidate[]> {
  const followed = await followedIds(db);
  const rows = (await db.select().from(podcastCandidates)
    .orderBy(sql`jsonb_array_length(${podcastCandidates.hits}) desc`, sql`${podcastCandidates.newestEpisodeAt} desc nulls last`).limit(limit + followed.size))
    .filter(row => !followed.has(row.itunesId)).slice(0, limit);
  const toolIds = [...new Set(rows.flatMap(row => row.hits.map(hit => hit.toolId)))];
  const names = new Map(toolIds.length ? (await db.select({ id: tools.id, name: tools.name }).from(tools).where(inArray(tools.id, toolIds))).map(tool => [tool.id, tool.name]) : []);
  return rows.map(row => ({
    id: row.id, itunesId: row.itunesId, title: row.title, author: row.author, imageUrl: row.imageUrl, language: row.language, category: row.category,
    episodeCount: row.episodeCount, newestEpisodeAt: row.newestEpisodeAt?.toISOString() ?? null, status: row.status,
    firstSeenAt: row.firstSeenAt.toISOString(), lastSeenAt: row.lastSeenAt.toISOString(),
    // Un outil retiré du catalogue depuis le passage disparaît du candidat.
    hits: row.hits.filter(hit => names.has(hit.toolId)).map(hit => ({ ...hit, toolName: names.get(hit.toolId) ?? '' })),
  }));
}

/** Écarte un candidat ou le remet dans la liste. false s'il n'existe pas. */
export async function setCandidateStatus(db: Db, id: string, status: CandidateStatus): Promise<boolean> {
  const rows = await db.update(podcastCandidates).set({ status }).where(and(eq(podcastCandidates.id, id))).returning({ id: podcastCandidates.id });
  return rows.length > 0;
}
