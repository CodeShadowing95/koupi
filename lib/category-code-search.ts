// Chercher des codes pour les catégories vides (aucun outil avec un code visible sur le site), ou pour une catégorie choisie.
// Pour chaque outil de ces catégories, une recherche YouTube « <outil> code promo » donne des vidéos récentes ;
// pour une catégorie choisie, une dernière recherche « <catégorie> code promo » repère aussi des outils absents du catalogue ;
// leurs descriptions passent par le même repérage que les podcasts (et par l'IA quand elle est active).
// Rien n'est publié : chaque code trouvé arrive « En attente » dans Vérifications, où l'admin décide.
// Quota YouTube : une recherche coûte 100 unités sur 10 000 par jour, la lecture des descriptions 1 unité.
import { eq, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { aiUsage, categories, toolSuggestions, tools } from '@/db/schema';
import { aiStatusOf, extractCodes } from './ai-extract';
import { listToolsAdmin, type AdminTool } from './catalog-admin';
import { resolveCreator } from './codes-admin';
import { mergeAiCodes, PROMO_HINT } from './podcast-ai';
import { domainOf, scanPromoCodes } from './podcast-codes';
import { addPendingCode } from './podcast-read';
import { aiSpendSince, startOfMonthUtc } from './verification-store';
import { runVerification, type RunDeps } from './verification-run';
import { youtubeFetch } from './api-usage';

/** Outils cherchés par lancement : 20 recherches = 2 000 unités, un cinquième du quota du jour. */
export const MAX_TOOLS_PER_RUN = 20;
export const VIDEOS_PER_TOOL = 8;
export const SEARCH_UNITS = 100;
/** On ne garde que les vidéos de l'année : un code plus ancien a peu de chances de marcher encore. */
export const SEARCH_DAYS = 365;
const DAY = 24 * 60 * 60 * 1000;

export type FoundVideo = { id: string; title: string; description: string; channelTitle: string };

export type YoutubeSearch = {
  /** Identifiants des vidéos trouvées pour une requête (100 unités). */
  search(query: string, options: { max: number; publishedAfter: Date }): Promise<string[]>;
  /** Titre, description complète et chaîne des vidéos (1 unité par lot de 50). */
  videos(ids: string[]): Promise<FoundVideo[]>;
};

/** Recherche par l'API officielle de YouTube. null sans clé. */
export function youtubeSearch(apiKey: string | undefined, fetchFn: typeof fetch = youtubeFetch): YoutubeSearch | null {
  if (!apiKey) return null;
  const get = async <T>(endpoint: string, params: Record<string, string>): Promise<T> => {
    const response = await fetchFn(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({ ...params, key: apiKey })}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`YouTube API ${endpoint} ${response.status}`);
    return response.json() as Promise<T>;
  };
  return {
    async search(query, { max, publishedAfter }) {
      const body = await get<{ items?: { id?: { videoId?: string } }[] }>('search', {
        part: 'id', type: 'video', q: query, maxResults: String(max), order: 'relevance', relevanceLanguage: 'fr', publishedAfter: publishedAfter.toISOString(),
      });
      return (body.items ?? []).map(item => item.id?.videoId).filter((id): id is string => Boolean(id));
    },
    async videos(ids) {
      if (ids.length === 0) return [];
      const body = await get<{ items?: { id?: string; snippet?: { title?: string; description?: string; channelTitle?: string } }[] }>('videos', { part: 'snippet', id: ids.slice(0, 50).join(','), maxResults: '50' });
      return (body.items ?? []).filter(item => item.id).map(item => ({ id: item.id!, title: item.snippet?.title ?? '', description: item.snippet?.description ?? '', channelTitle: item.snippet?.channelTitle ?? '' }));
    },
  };
}

/**
 * Outils à chercher. Sans catégorie : ceux des catégories vides sur le site, priorité 1 d'abord, puis ceux qui ont le moins de codes.
 * Avec une catégorie (vide ou non) : tous ses outils, ceux qui ont le moins de codes d'abord.
 */
export function toolsToSearch(all: AdminTool[], options: { categorySlug?: string; max?: number } = {}): { tools: AdminTool[]; remaining: number } {
  const active = all.filter(tool => !tool.archived);
  const byName = (a: AdminTool, b: AdminTool) => a.name.localeCompare(b.name, 'fr');
  let candidates: AdminTool[];
  if (options.categorySlug) {
    candidates = active.filter(tool => tool.categorySlug === options.categorySlug)
      .sort((a, b) => a.visible - b.visible || a.codes - b.codes || a.priority - b.priority || byName(a, b));
  } else {
    const covered = new Set(active.filter(tool => tool.visible > 0).map(tool => tool.categorySlug));
    candidates = active.filter(tool => !covered.has(tool.categorySlug))
      .sort((a, b) => a.priority - b.priority || a.codes - b.codes || byName(a, b));
  }
  const max = options.max ?? MAX_TOOLS_PER_RUN;
  return { tools: candidates.slice(0, max), remaining: Math.max(0, candidates.length - max) };
}

export type CategorySearchReport = {
  tools: number;
  /** Recherches YouTube lancées (une par outil, plus une sur le nom de la catégorie choisie). */
  searches: number;
  /** Outils des catégories vides pas encore cherchés à ce lancement (plafond atteint). */
  remaining: number;
  videos: number;
  found: { tool: string; code: string; creator: string }[];
  suggested: { tool: string; code: string }[];
  /** Unités du quota YouTube utilisées par ce lancement (environ). */
  units: number;
  aiRead: number;
  failed: string[];
};

/** Cherche des codes pour les outils des catégories vides, ou pour une catégorie choisie (categorySlug). */
export async function searchCategoryCodes(db: Db, youtube: YoutubeSearch, options: { categorySlug?: string; max?: number; deps?: RunDeps; now?: Date } = {}): Promise<CategorySearchReport> {
  const now = options.now ?? new Date();
  const { tools: targets, remaining } = toolsToSearch(await listToolsAdmin(db), options);
  const queries = targets.map(tool => ({ label: tool.name, query: `${tool.name} code promo` }));
  let origin = 'Recherche des catégories vides';
  if (options.categorySlug) {
    const [category] = await db.select({ name: categories.name }).from(categories).where(eq(categories.slug, options.categorySlug)).limit(1);
    if (category) {
      origin = `Recherche ciblée ${category.name}`;
      queries.push({ label: category.name, query: `${category.name} code promo` });
    }
  }
  const report: CategorySearchReport = { tools: targets.length, searches: 0, remaining, videos: 0, found: [], suggested: [], units: 0, aiRead: 0, failed: [] };
  if (queries.length === 0) return report;
  const catalog = (await db.select({ id: tools.id, name: tools.name, website: tools.website }).from(tools).where(sql`${tools.archivedAt} is null`))
    .map(tool => ({ id: tool.id, name: tool.name, domain: domainOf(tool.website) }));
  const toolName = new Map(catalog.map(tool => [tool.id, tool.name]));
  const ai = options.deps?.ai;
  const seenVideos = new Set<string>();

  async function readWithAi(video: FoundVideo, url: string) {
    if (!ai?.create || !PROMO_HINT.test(`${video.title}\n${video.description}`)) return [];
    if (aiStatusOf(ai.config, await aiSpendSince(db, startOfMonthUtc(now))).state !== 'active') return [];
    try {
      const extraction = await extractCodes(ai.create, ai.config.model, { title: video.title, description: video.description });
      await db.insert(aiUsage).values({ purpose: 'category_search', model: extraction.model, costUsdMicros: extraction.costUsdMicros, ref: url });
      report.aiRead++;
      return extraction.codes;
    } catch (error) {
      console.error('category search AI failed', error);
      return [];
    }
  }

  for (const { label, query } of queries) {
    let videos: FoundVideo[];
    try {
      const ids = await youtube.search(query, { max: VIDEOS_PER_TOOL, publishedAfter: new Date(now.getTime() - SEARCH_DAYS * DAY) });
      report.searches++;
      report.units += SEARCH_UNITS;
      const fresh = ids.filter(id => !seenVideos.has(id));
      fresh.forEach(id => seenVideos.add(id));
      videos = await youtube.videos(fresh);
      if (fresh.length) report.units += 1;
    } catch (error) {
      console.error('category search failed', label, error);
      report.failed.push(label);
      // Quota épuisé ou clé refusée : les recherches suivantes échoueraient aussi.
      if (String(error).includes(' 403')) break;
      continue;
    }
    report.videos += videos.length;
    for (const video of videos) {
      const sourceUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const scan = mergeAiCodes(scanPromoCodes(`${video.title}\n${video.description}`, catalog), await readWithAi(video, sourceUrl), catalog);
      if (scan.found.length === 0 && scan.unknown.length === 0) continue;
      const creatorId = await resolveCreator(db, video.channelTitle || 'Chaîne YouTube');
      for (const found of scan.found) {
        const codeId = await addPendingCode(db, {
          toolId: found.toolId, creatorId, code: found.code, discount: found.discount, sourceUrl, sourceTitle: video.title,
          note: `Trouvé par la recherche « ${query} » : « ${found.evidence} »`, expiresOn: found.expiresOn,
        }, `${origin} : ${label}`);
        if (!codeId) continue;
        report.found.push({ tool: toolName.get(found.toolId) ?? '', code: found.code, creator: video.channelTitle });
        if (options.deps) await runVerification(db, codeId, options.deps).catch(error => console.error('category search verification failed', error));
      }
      for (const item of scan.unknown) {
        const inserted = await db.insert(toolSuggestions).values({
          name: item.name.slice(0, 120), domain: item.domain, code: item.code, discount: item.discount, evidence: item.evidence,
          sourceUrl, sourceTitle: video.title.slice(0, 300), creatorId,
        }).onConflictDoNothing().returning({ id: toolSuggestions.id });
        if (inserted.length) report.suggested.push({ tool: item.domain ?? item.name, code: item.code });
      }
    }
  }
  return report;
}
