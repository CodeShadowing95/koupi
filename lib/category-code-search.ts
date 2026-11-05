// Chercher des codes pour les catégories vides (aucun outil avec un code visible sur le site), ou pour une catégorie choisie.
// Pour chaque outil de ces catégories, une recherche YouTube « <outil> code promo » donne des vidéos récentes ;
// pour une catégorie choisie, une dernière recherche « <catégorie> code promo » repère aussi des outils absents du catalogue ;
// leurs descriptions passent par le même repérage que les podcasts (et par l'IA quand elle est active).
// Chaque recherche d'un même outil change de formulation (lib/youtube-queries.ts) et les vidéos déjà lues sont écartées (ADR-0033).
// Rien n'est publié : chaque code trouvé arrive « En attente » dans Vérifications, où l'admin décide.
// Quota YouTube : une recherche coûte 100 unités sur 10 000 par jour, la lecture des descriptions 1 unité.
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { aiUsage, categories, creatorAccounts, toolSuggestions, tools, youtubeSearches, youtubeSeenVideos } from '@/db/schema';
import { aiStatusOf, extractCodes } from './ai-extract';
import { listToolsAdmin, type AdminTool } from './catalog-admin';
import { resolveCreator } from './codes-admin';
import { mergeAiCodes, PROMO_HINT } from './podcast-ai';
import { domainOf, scanPromoCodes } from './podcast-codes';
import { addPendingCode } from './podcast-read';
import { aiSpendSince, startOfMonthUtc } from './verification-store';
import { runVerification, type RunDeps } from './verification-run';
import { youtubeFetch } from './api-usage';
import { nextQuery, type PastSearch } from './youtube-queries';

/** Outils cherchés par lancement : 20 recherches = 2 000 unités, un cinquième du quota du jour. */
export const MAX_TOOLS_PER_RUN = 20;
/** Une recherche coûte 100 unités qu'elle rende 8 ou 20 vidéos : on en demande 20, les déjà lues sont écartées. */
export const VIDEOS_PER_TOOL = 20;
export const SEARCH_UNITS = 100;

export type FoundVideo = { id: string; title: string; description: string; channelTitle: string; channelId?: string };

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
      const body = await get<{ items?: { id?: string; snippet?: { title?: string; description?: string; channelTitle?: string; channelId?: string } }[] }>('videos', { part: 'snippet', id: ids.slice(0, 50).join(','), maxResults: '50' });
      return (body.items ?? []).filter(item => item.id).map(item => ({
        id: item.id!, title: item.snippet?.title ?? '', description: item.snippet?.description ?? '', channelTitle: item.snippet?.channelTitle ?? '',
        ...(item.snippet?.channelId ? { channelId: item.snippet.channelId } : {}),
      }));
    },
  };
}

/**
 * Outils à chercher. Sans catégorie : ceux des catégories vides sur le site, priorité 1 d'abord, puis ceux qui ont le moins de codes.
 * Avec une catégorie (vide ou non) : tous ses outils, ceux qui ont le moins de codes d'abord.
 */
export function toolsToSearch(all: AdminTool[], options: { categorySlug?: string; toolId?: string; max?: number } = {}): { tools: AdminTool[]; remaining: number } {
  const active = all.filter(tool => !tool.archived);
  const byName = (a: AdminTool, b: AdminTool) => a.name.localeCompare(b.name, 'fr');
  let candidates: AdminTool[];
  if (options.toolId) {
    // Un seul outil, choisi dans sa fiche : même s'il a déjà des codes visibles.
    candidates = active.filter(tool => tool.id === options.toolId);
  } else if (options.categorySlug) {
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
  /** Ce qui a été cherché, pour le journal des passages : « Catégories vides », « Catégorie VPN », « Outil NordVPN ». */
  scope: string;
  tools: number;
  /** Recherches YouTube lancées (une par outil, plus une sur le nom de la catégorie choisie). */
  searches: number;
  /** Outils des catégories vides pas encore cherchés à ce lancement (plafond atteint). */
  remaining: number;
  videos: number;
  /** Vidéos rendues par YouTube mais déjà lues lors d'une recherche précédente : écartées sans être relues. */
  skipped: number;
  /** Chaînes des vidéos lues : jamais vues avant, ou déjà connues (compte d'un créateur ou vidéo déjà lue). */
  newChannels: number;
  knownChannels: number;
  /** Formulations employées, dans l'ordre (« code promo », « promo code »…). */
  variants: string[];
  found: { tool: string; code: string; creator: string }[];
  suggested: { tool: string; code: string }[];
  /** Unités du quota YouTube utilisées par ce lancement (environ). */
  units: number;
  aiRead: number;
  failed: string[];
};

/** Cherche des codes pour les outils des catégories vides, pour une catégorie choisie (categorySlug) ou pour un seul outil (toolId). */
export async function searchCategoryCodes(db: Db, youtube: YoutubeSearch, options: { categorySlug?: string; toolId?: string; max?: number; deps?: RunDeps; now?: Date } = {}): Promise<CategorySearchReport> {
  const now = options.now ?? new Date();
  const { tools: targets, remaining } = toolsToSearch(await listToolsAdmin(db), options);
  const subjects: { label: string; toolId: string | null; categorySlug: string | null }[] = targets.map(tool => ({ label: tool.name, toolId: tool.id, categorySlug: null }));
  let origin = 'Recherche des catégories vides';
  let scope = 'Catégories vides';
  if (options.toolId) {
    origin = `Recherche ciblée ${targets[0]?.name ?? 'outil'}`;
    scope = `Outil ${targets[0]?.name ?? ''}`.trim();
  } else if (options.categorySlug) {
    const [category] = await db.select({ name: categories.name }).from(categories).where(eq(categories.slug, options.categorySlug)).limit(1);
    if (category) {
      origin = `Recherche ciblée ${category.name}`;
      scope = `Catégorie ${category.name}`;
      subjects.push({ label: category.name, toolId: null, categorySlug: options.categorySlug });
    }
  }
  const report: CategorySearchReport = {
    scope, tools: targets.length, searches: 0, remaining, videos: 0, skipped: 0, newChannels: 0, knownChannels: 0, variants: [], found: [], suggested: [], units: 0, aiRead: 0, failed: [],
  };
  if (subjects.length === 0) return report;
  const catalog = (await db.select({ id: tools.id, name: tools.name, website: tools.website }).from(tools).where(sql`${tools.archivedAt} is null`))
    .map(tool => ({ id: tool.id, name: tool.name, domain: domainOf(tool.website) }));
  const toolName = new Map(catalog.map(tool => [tool.id, tool.name]));
  const ai = options.deps?.ai;
  const seenVideos = new Set<string>();
  // Chaînes déjà connues avant ce lancement : comptes YouTube des créateurs et chaînes des vidéos déjà lues.
  const knownChannels = new Set([
    ...(await db.select({ id: creatorAccounts.externalId }).from(creatorAccounts).where(and(eq(creatorAccounts.platform, 'youtube'), isNotNull(creatorAccounts.externalId)))).map(row => row.id!),
    ...(await db.selectDistinct({ id: youtubeSeenVideos.channelId }).from(youtubeSeenVideos).where(isNotNull(youtubeSeenVideos.channelId))).map(row => row.id!),
  ]);
  const channelsThisRun = new Set<string>();

  async function pastSearches(subject: (typeof subjects)[number]): Promise<PastSearch[]> {
    const where = subject.toolId ? eq(youtubeSearches.toolId, subject.toolId) : eq(youtubeSearches.categorySlug, subject.categorySlug!);
    return db.select({ variant: youtubeSearches.variant, searchedAt: youtubeSearches.searchedAt }).from(youtubeSearches).where(where).orderBy(desc(youtubeSearches.searchedAt)).limit(50);
  }

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

  for (const subject of subjects) {
    const { label } = subject;
    const { variant, query, publishedAfter } = nextQuery(label, await pastSearches(subject), now);
    let videos: FoundVideo[];
    let returned: number;
    try {
      const ids = await youtube.search(query, { max: VIDEOS_PER_TOOL, publishedAfter });
      report.searches++;
      report.units += SEARCH_UNITS;
      report.variants.push(variant);
      const unique = [...new Set(ids)].filter(id => !seenVideos.has(id));
      unique.forEach(id => seenVideos.add(id));
      const already = new Set(unique.length ? (await db.select({ id: youtubeSeenVideos.videoId }).from(youtubeSeenVideos).where(inArray(youtubeSeenVideos.videoId, unique))).map(row => row.id) : []);
      const fresh = unique.filter(id => !already.has(id));
      returned = ids.length;
      report.skipped += already.size;
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
    let codesForQuery = 0;
    for (const video of videos) {
      if (video.channelId && !channelsThisRun.has(video.channelId)) {
        channelsThisRun.add(video.channelId);
        if (knownChannels.has(video.channelId)) report.knownChannels++;
        else report.newChannels++;
      }
      const sourceUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const scan = mergeAiCodes(scanPromoCodes(`${video.title}\n${video.description}`, catalog), await readWithAi(video, sourceUrl), catalog);
      let codesForVideo = 0;
      if (scan.found.length > 0 || scan.unknown.length > 0) {
        const creatorId = await resolveCreator(db, video.channelTitle || 'Chaîne YouTube');
        for (const found of scan.found) {
          const codeId = await addPendingCode(db, {
            toolId: found.toolId, creatorId, code: found.code, discount: found.discount, sourceUrl, sourceTitle: video.title,
            note: `Trouvé par la recherche « ${query} » : « ${found.evidence} »`, expiresOn: found.expiresOn, origin: 'youtube_search',
          }, `${origin} : ${label}`);
          if (!codeId) continue;
          codesForVideo++;
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
      codesForQuery += codesForVideo;
      await db.insert(youtubeSeenVideos).values({
        videoId: video.id, channelId: video.channelId ?? null, channelTitle: video.channelTitle.slice(0, 200), toolId: subject.toolId, query, codes: codesForVideo, seenAt: now,
      }).onConflictDoNothing();
    }
    await db.insert(youtubeSearches).values({
      toolId: subject.toolId, categorySlug: subject.categorySlug, variant, query, videos: returned, newVideos: videos.length, codes: codesForQuery, searchedAt: now,
    });
  }
  return report;
}
