// Chaînes YouTube suivies (ADR-0034) : chaque nuit, Merkod lit les nouvelles vidéos des chaînes des créateurs qu'on suit
// et cherche des codes dans leur description, comme pour les podcasts. Une chaîne coûte 1 unité du quota (liste des
// vidéos mises en ligne), plus 1 unité par lot de 50 descriptions, contre 100 pour une recherche.
// Rien n'est publié : chaque code trouvé arrive « En attente » dans Vérifications.
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { aiUsage, codes, creatorAccounts, toolSuggestions, tools, watchedSources, youtubeSeenVideos } from '@/db/schema';
import { aiStatusOf, extractCodes } from './ai-extract';
import { offerLinksEnabled } from './site-settings';
import { youtubeFetch } from './api-usage';
import type { FoundVideo } from './category-code-search';
import { resolveCreator } from './codes-admin';
import { clip } from './verification';
import { forVideo, mergeAiCodes, PROMO_HINT } from './podcast-ai';
import { domainOf, scanPromoCodes } from './podcast-codes';
import { addPendingCode } from './podcast-read';
import { aiSpendSince, startOfMonthUtc } from './verification-store';
import { runVerification, type RunDeps } from './verification-run';
import { compilationNote, creditedCreator, type CreatorFinder, type CreditedCreator } from './compilation-creator';

/** Premier passage : on remonte ce nombre de jours. Ensuite, depuis la dernière lecture (avec une marge). */
export const FIRST_READ_DAYS = 45;
const MARGIN_DAYS = 2;
/** Vidéos récentes demandées par chaîne : une seule page, donc 1 unité. */
export const UPLOADS_PER_CHANNEL = 20;
/** Chaînes lues par passage : au pire 200 unités, 2 % du quota du jour. Les moins récemment lues d'abord. */
export const MAX_CHANNELS_PER_RUN = 200;
/**
 * Temps de lecture d'un passage. Vercel coupe une fonction à 300 s (maxDuration) : au-delà de 4 minutes, on s'arrête
 * proprement après la chaîne en cours. Les chaînes restantes, les moins récemment lues, passent en tête au passage suivant.
 */
export const RUN_BUDGET_MS = 240_000;
/** Requête notée pour une vidéo lue depuis une chaîne suivie (table des vidéos déjà lues). */
export const CHANNEL_QUERY = 'Chaîne suivie';
const DAY = 24 * 60 * 60 * 1000;

export type Upload = { videoId: string; publishedAt: Date | null };

export type YoutubeChannels = {
  /** Dernières vidéos mises en ligne par la chaîne (1 unité). */
  uploads(channelId: string, max: number): Promise<Upload[]>;
  /** Titre, description et chaîne des vidéos (1 unité par lot de 50). */
  videos(ids: string[]): Promise<FoundVideo[]>;
};

/** La liste « Mises en ligne » d'une chaîne a le même identifiant, préfixe UU au lieu de UC. */
export function uploadsPlaylistId(channelId: string): string | null {
  return /^UC[\w-]{22}$/.test(channelId) ? `UU${channelId.slice(2)}` : null;
}

/** Lecture par l'API officielle de YouTube. null sans clé. */
export function youtubeChannels(apiKey: string | undefined, fetchFn: typeof fetch = youtubeFetch): YoutubeChannels | null {
  if (!apiKey) return null;
  const get = async <T>(endpoint: string, params: Record<string, string>): Promise<T | null> => {
    const response = await fetchFn(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({ ...params, key: apiKey })}`, { cache: 'no-store' });
    // Chaîne sans vidéo ou supprimée : rien à lire, ce n'est pas une panne.
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`YouTube API ${endpoint} ${response.status}`);
    return response.json() as Promise<T>;
  };
  return {
    async uploads(channelId, max) {
      const playlistId = uploadsPlaylistId(channelId);
      if (!playlistId) return [];
      const body = await get<{ items?: { contentDetails?: { videoId?: string; videoPublishedAt?: string } }[] }>('playlistItems', { part: 'contentDetails', playlistId, maxResults: String(max) });
      return (body?.items ?? []).flatMap(item => item.contentDetails?.videoId
        ? [{ videoId: item.contentDetails.videoId, publishedAt: item.contentDetails.videoPublishedAt ? new Date(item.contentDetails.videoPublishedAt) : null }]
        : []);
    },
    async videos(ids) {
      const found: FoundVideo[] = [];
      for (let start = 0; start < ids.length; start += 50) {
        const body = await get<{ items?: { id?: string; snippet?: { title?: string; description?: string; channelTitle?: string; channelId?: string } }[] }>('videos', { part: 'snippet', id: ids.slice(start, start + 50).join(','), maxResults: '50' });
        for (const item of body?.items ?? []) {
          if (!item.id) continue;
          found.push({ id: item.id, title: item.snippet?.title ?? '', description: item.snippet?.description ?? '', channelTitle: item.snippet?.channelTitle ?? '', ...(item.snippet?.channelId ? { channelId: item.snippet.channelId } : {}) });
        }
      }
      return found;
    },
  };
}

// ---------- Suivre ou non une chaîne ----------

export type ChannelWatch = { id: string; active: boolean; lastFetchedAt: string | null };

/** Chaînes YouTube suivies (ou en pause), par identifiant de chaîne. */
export async function channelWatches(db: Db): Promise<Map<string, ChannelWatch>> {
  const rows = await db.select({ id: watchedSources.id, externalId: watchedSources.externalId, active: watchedSources.active, lastFetchedAt: watchedSources.lastFetchedAt })
    .from(watchedSources).where(eq(watchedSources.platform, 'youtube'));
  return new Map(rows.map(row => [row.externalId, { id: row.id, active: row.active, lastFetchedAt: row.lastFetchedAt?.toISOString() ?? null }]));
}

/** Suit (ou met en pause) les vidéos de la chaîne d'un compte YouTube relié. La chaîne reste en base en pause : sa date de lecture est gardée. */
export async function setChannelWatch(db: Db, accountId: string, follow: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const [account] = await db.select().from(creatorAccounts).where(eq(creatorAccounts.id, accountId)).limit(1);
  if (!account) return { ok: false, error: 'Compte introuvable.' };
  if (account.platform !== 'youtube' || !account.externalId || !uploadsPlaylistId(account.externalId)) return { ok: false, error: 'Seule une chaîne YouTube lue par Merkod (avec son identifiant) peut être suivie.' };
  await db.insert(watchedSources).values({ platform: 'youtube', externalId: account.externalId, title: account.handle.slice(0, 200), creatorId: account.creatorId, active: follow })
    .onConflictDoUpdate({ target: [watchedSources.platform, watchedSources.externalId], set: { active: follow, creatorId: account.creatorId } });
  return { ok: true };
}

/** Suit d'un coup les chaînes YouTube des créateurs qui ont au moins un code. Une chaîne mise en pause à la main reste en pause. */
export async function followChannelsWithCodes(db: Db): Promise<{ followed: number; already: number }> {
  const accounts = await db.selectDistinct({ creatorId: creatorAccounts.creatorId, externalId: creatorAccounts.externalId, handle: creatorAccounts.handle })
    .from(creatorAccounts)
    .innerJoin(codes, and(eq(codes.creatorId, creatorAccounts.creatorId), sql`${codes.archivedAt} is null`))
    .where(and(eq(creatorAccounts.platform, 'youtube'), isNotNull(creatorAccounts.externalId)));
  const watches = await channelWatches(db);
  let followed = 0;
  let already = 0;
  for (const account of accounts) {
    if (!account.externalId || !uploadsPlaylistId(account.externalId)) continue;
    if (watches.has(account.externalId)) { already++; continue; }
    await db.insert(watchedSources).values({ platform: 'youtube', externalId: account.externalId, title: account.handle.slice(0, 200), creatorId: account.creatorId })
      .onConflictDoNothing();
    watches.set(account.externalId, { id: '', active: true, lastFetchedAt: null });
    followed++;
  }
  return { followed, already };
}

// ---------- Lecture ----------

export type ChannelReadReport = {
  channels: number;
  /** Nouvelles vidéos lues (descriptions demandées à YouTube). */
  videos: number;
  /** Vidéos récentes déjà lues avant (par une recherche ou une lecture précédente) : écartées. */
  skipped: number;
  found: { channel: string; code: string; tool: string }[];
  suggested: { channel: string; code: string; tool: string }[];
  /** Unités du quota YouTube utilisées (environ). */
  units: number;
  aiRead: number;
  failed: string[];
  /** Chaînes suivies pas lues à ce passage (plafond atteint) : lues au prochain. */
  remaining: number;
};

/** Lit les nouvelles vidéos des chaînes suivies actives (ou d'une seule, même en pause, avec onlyId). */
export async function readYoutubeChannels(db: Db, youtube: YoutubeChannels, options: { onlyId?: string; deps?: RunDeps; now?: Date; max?: number; budgetMs?: number; clock?: () => number; creators?: CreatorFinder | null } = {}): Promise<ChannelReadReport> {
  const now = options.now ?? new Date();
  const report: ChannelReadReport = { channels: 0, videos: 0, skipped: 0, found: [], suggested: [], units: 0, aiRead: 0, failed: [], remaining: 0 };
  const all = await db.select().from(watchedSources)
    .where(and(eq(watchedSources.platform, 'youtube'), options.onlyId ? eq(watchedSources.id, options.onlyId) : eq(watchedSources.active, true)))
    .orderBy(sql`${watchedSources.lastFetchedAt} asc nulls first`, asc(watchedSources.title));
  const max = options.max ?? MAX_CHANNELS_PER_RUN;
  const channels = all.slice(0, max);
  report.remaining = Math.max(0, all.length - max);
  if (channels.length === 0) return report;

  const catalog = (await db.select({ id: tools.id, name: tools.name, website: tools.website }).from(tools).where(sql`${tools.archivedAt} is null`))
    .map(tool => ({ id: tool.id, name: tool.name, domain: domainOf(tool.website) }));
  const toolName = new Map(catalog.map(tool => [tool.id, tool.name]));
  const ai = options.deps?.ai;
  const monthStart = startOfMonthUtc(now);
  // Option « Liens d'affiliation » de l'espace Administration : coupée, l'IA ne relève que des codes.
  const links = await offerLinksEnabled(db);
  // Vidéos « compilation » : un nom n'est cherché qu'une fois par passage.
  const credited = new Map<string, CreditedCreator>();
  async function readWithAi(video: FoundVideo, url: string) {
    if (!ai?.create || !PROMO_HINT.test(`${video.title}\n${video.description}`)) return [];
    if (aiStatusOf(ai.config, await aiSpendSince(db, monthStart)).state !== 'active') return [];
    try {
      const extraction = await extractCodes(ai.create, ai.config.model, { title: video.title, description: video.description }, { links });
      await db.insert(aiUsage).values({ purpose: 'youtube_channel', model: extraction.model, costUsdMicros: extraction.costUsdMicros, ref: url });
      report.aiRead++;
      return extraction.codes;
    } catch (error) {
      console.error('youtube channel AI failed', error);
      return [];
    }
  }

  const clock = options.clock ?? Date.now;
  const startedAt = clock();
  const budget = options.budgetMs ?? RUN_BUDGET_MS;
  for (const [index, channel] of channels.entries()) {
    if (index > 0 && clock() - startedAt > budget) {
      report.remaining += channels.length - index;
      break;
    }
    report.channels++;
    let videos: FoundVideo[];
    try {
      const uploads = await youtube.uploads(channel.externalId, UPLOADS_PER_CHANNEL);
      report.units += 1;
      const since = channel.lastFetchedAt ? channel.lastFetchedAt.getTime() - MARGIN_DAYS * DAY : now.getTime() - FIRST_READ_DAYS * DAY;
      const recent = [...new Set(uploads.filter(upload => upload.publishedAt && upload.publishedAt.getTime() >= since).map(upload => upload.videoId))];
      const already = new Set(recent.length ? (await db.select({ id: youtubeSeenVideos.videoId }).from(youtubeSeenVideos).where(inArray(youtubeSeenVideos.videoId, recent))).map(row => row.id) : []);
      const fresh = recent.filter(id => !already.has(id));
      report.skipped += already.size;
      videos = fresh.length ? await youtube.videos(fresh) : [];
      report.units += Math.ceil(fresh.length / 50);
    } catch (error) {
      console.error('youtube channel read failed', channel.title, error);
      report.failed.push(channel.title);
      // Quota épuisé ou clé refusée : les chaînes suivantes échoueraient aussi.
      if (String(error).includes(' 403')) break;
      continue;
    }
    report.videos += videos.length;
    const creatorId = channel.creatorId ?? await resolveCreator(db, channel.title);

    const readVideo = async (video: FoundVideo) => {
      const sourceUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const merged = mergeAiCodes(scanPromoCodes(`${video.title}\n${video.description}`, catalog), await readWithAi(video, sourceUrl), catalog);
      const scan = { found: forVideo(merged.found), unknown: forVideo(merged.unknown) };
      let codesForVideo = 0;
      for (const found of scan.found) {
        // Code attribué à un autre créateur que la chaîne (vidéo « compilation ») : crédité à ce créateur.
        const other = await creditedCreator(db, options.creators ?? null, found.creator, channel.title, credited, now);
        if (other) report.units += other.units;
        const codeId = await addPendingCode(db, {
          toolId: found.toolId, creatorId: other?.creatorId ?? creatorId, code: found.code, link: found.link, discount: found.discount, sourceUrl, sourceTitle: video.title,
          note: other ? compilationNote(channel.title, other.name, found.evidence) : `Trouvé dans une vidéo de la chaîne suivie ${channel.title} : « ${found.evidence} »`,
          expiresOn: found.expiresOn, origin: 'youtube_channel',
        }, `Chaîne suivie ${channel.title}`);
        if (!codeId) continue;
        codesForVideo++;
        report.found.push({ channel: channel.title, code: found.code || 'lien', tool: toolName.get(found.toolId) ?? '' });
        if (options.deps) await runVerification(db, codeId, options.deps).catch(error => console.error('youtube channel verification failed', error));
      }
      for (const item of scan.unknown) {
        const other = await creditedCreator(db, options.creators ?? null, item.creator, channel.title, credited, now);
        if (other) report.units += other.units;
        const inserted = await db.insert(toolSuggestions).values({
          name: clip(item.name, 120), domain: item.domain, code: item.code || null, link: item.link || null, discount: item.discount, evidence: item.evidence,
          sourceUrl, sourceTitle: clip(video.title, 300), creatorId: other?.creatorId ?? creatorId,
        }).onConflictDoNothing().returning({ id: toolSuggestions.id });
        if (inserted.length) report.suggested.push({ channel: channel.title, code: item.code || 'lien', tool: item.domain ?? item.name });
      }
      await db.insert(youtubeSeenVideos).values({
        videoId: video.id, channelId: video.channelId ?? channel.externalId, channelTitle: clip(video.channelTitle || channel.title, 200), toolId: null, query: CHANNEL_QUERY, codes: codesForVideo, seenAt: now,
      }).onConflictDoNothing();
    };

    for (const video of videos) {
      // Une vidéo en erreur (texte refusé par la base, IA indisponible…) ne doit pas arrêter les autres ni les chaînes suivantes.
      try {
        await readVideo(video);
      } catch (error) {
        console.error('youtube channel video failed', video.id, error);
        report.failed.push(`${channel.title} (vidéo ${video.id})`);
      }
    }
    await db.update(watchedSources).set({ lastFetchedAt: now, ...(channel.creatorId ? {} : { creatorId }) }).where(eq(watchedSources.id, channel.id));
  }
  return report;
}
