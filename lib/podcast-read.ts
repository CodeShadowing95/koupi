// Lecture des podcasts suivis : derniers épisodes dans Apple Podcasts, codes repérés dans leurs notes,
// ajoutés « En attente » (jamais visibles sur le site) puis analysés pour la page Vérifications.
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { aiUsage, codeLogs, codes, toolSuggestions, tools, watchedSources } from '@/db/schema';
import { aiStatusOf, extractCodes } from './ai-extract';
import { mergeAiCodes, PROMO_HINT } from './podcast-ai';
import { aiSpendSince, startOfMonthUtc } from './verification-store';
import { clip } from './verification';
import { applePodcastUrl } from './podcasts-admin';
import { appleEpisodeRef, type PodcastDirectory } from './apple-podcasts';
import { resolveCreator } from './codes-admin';
import { domainOf, scanPromoCodes } from './podcast-codes';
import type { CodeOrigin } from './code-origin';
import { runVerification, type RunDeps } from './verification-run';

/** Premier passage : on remonte ce nombre de jours. Ensuite, depuis la dernière lecture (avec une marge). */
export const FIRST_READ_DAYS = 45;
const MARGIN_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

export type PodcastReadReport = {
  podcasts: number;
  episodes: number;
  found: { podcast: string; code: string; tool: string }[];
  /** Codes d'outils absents du catalogue, gardés en suggestion. */
  suggested: { podcast: string; code: string; tool: string }[];
  failed: string[];
  /** Épisodes dont les notes ont aussi été lues par l'IA (0 quand elle n'est pas active). */
  aiRead: number;
};

export type PodcastCodeInput = { toolId: string; creatorId: string; code: string; discount: string; sourceUrl: string; sourceTitle: string; note: string; podcastTitle: string; expiresOn?: string;
  /** Podcast par défaut ; une suggestion d'outil venue d'une vidéo garde son origine YouTube. */
  origin?: CodeOrigin };

export type PendingCodeInput = Omit<PodcastCodeInput, 'podcastTitle' | 'origin'> & { origin: CodeOrigin };

/** Ajoute en attente un code trouvé automatiquement, sauf s'il est déjà connu pour cet outil. null s'il existait. */
export async function addPendingCode(db: Db, input: PendingCodeInput, logNote: string): Promise<string | null> {
  // Déjà connu pour cet outil (même rejeté ou archivé) : on ne le recrée pas.
  // Les règles de la table codes (codes_code_len, codes_discount_len) : un code mal lu est ignoré
  // au lieu de faire échouer tout le passage.
  const code = input.code.trim();
  if (code.length < 1 || code.length > 120 || !/^https?:\/\//i.test(input.sourceUrl)) return null;
  const discount = clip(input.discount.trim(), 240).trim() || 'Voir la source';
  const [known] = await db.select({ id: codes.id }).from(codes)
    .where(and(eq(codes.toolId, input.toolId), sql`lower(${codes.code}) = lower(${code})`)).limit(1);
  if (known) return null;
  const [created] = await db.insert(codes).values({
    toolId: input.toolId, creatorId: input.creatorId, code, discount, sourceUrl: input.sourceUrl,
    sourceTitle: input.sourceTitle.slice(0, 300), status: 'pending', note: input.note.slice(0, 1000), origin: input.origin,
    ...(input.expiresOn && /^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn) ? { expiresOn: input.expiresOn } : {}),
  }).returning({ id: codes.id });
  await db.insert(codeLogs).values({ codeId: created.id, action: 'create', nextStatus: 'pending', note: logNote.slice(0, 1000) });
  return created.id;
}

/** Ajoute en attente un code trouvé dans un podcast, sauf s'il est déjà connu pour cet outil. null s'il existait. */
export async function addPodcastCode(db: Db, { podcastTitle, origin, ...input }: PodcastCodeInput): Promise<string | null> {
  return addPendingCode(db, { ...input, origin: origin ?? 'podcast' }, `Lecture du podcast ${podcastTitle}`);
}

/** Lit les épisodes récents des podcasts actifs (ou d'un seul, même en pause, avec onlyId). */
export async function readPodcasts(db: Db, directory: PodcastDirectory, options: { onlyId?: string; deps?: RunDeps; now?: Date } = {}): Promise<PodcastReadReport> {
  const now = options.now ?? new Date();
  const report: PodcastReadReport = { podcasts: 0, episodes: 0, found: [], suggested: [], failed: [], aiRead: 0 };
  const podcasts = await db.select().from(watchedSources)
    .where(and(eq(watchedSources.platform, 'podcast'), options.onlyId ? eq(watchedSources.id, options.onlyId) : eq(watchedSources.active, true)))
    .orderBy(asc(watchedSources.title));
  if (podcasts.length === 0) return report;
  const catalog = (await db.select({ id: tools.id, name: tools.name, website: tools.website }).from(tools).where(sql`${tools.archivedAt} is null`))
    .map(tool => ({ id: tool.id, name: tool.name, domain: domainOf(tool.website) }));
  const toolName = new Map(catalog.map(tool => [tool.id, tool.name]));
  const ai = options.deps?.ai;
  const monthStart = startOfMonthUtc(now);
  // L'IA lit aussi les notes qui parlent d'une offre, tant qu'elle est active et sous le plafond du mois.
  async function readWithAi(title: string, description: string, ref: string) {
    if (!ai?.create || !PROMO_HINT.test(`${title}\n${description}`)) return [];
    if (aiStatusOf(ai.config, await aiSpendSince(db, monthStart)).state !== 'active') return [];
    try {
      const extraction = await extractCodes(ai.create, ai.config.model, { title, description });
      await db.insert(aiUsage).values({ purpose: 'podcast_notes', model: extraction.model, costUsdMicros: extraction.costUsdMicros, ref: ref.slice(0, 500) });
      report.aiRead++;
      return extraction.codes;
    } catch (error) {
      console.error('podcast notes AI failed', error);
      return [];
    }
  }

  for (const podcast of podcasts) {
    report.podcasts++;
    const podcastId = Number(podcast.externalId);
    let episodes;
    try { episodes = await directory.episodes(podcastId, { max: 50 }); }
    catch (error) { console.error('podcast episodes failed', podcast.title, error); report.failed.push(podcast.title); continue; }

    const since = podcast.lastFetchedAt ? podcast.lastFetchedAt.getTime() - MARGIN_DAYS * DAY : now.getTime() - FIRST_READ_DAYS * DAY;
    const fresh = episodes.filter(episode => episode.publishedAt && episode.publishedAt.getTime() >= since);
    report.episodes += fresh.length;
    const creatorId = podcast.creatorId ?? await resolveCreator(db, podcast.title);

    for (const episode of fresh) {
      const sourceUrl = appleEpisodeRef(episode.link) ? episode.link : applePodcastUrl(podcastId, episode.id);
      const scan = mergeAiCodes(scanPromoCodes(`${episode.title}\n${episode.description}`, catalog), 
        // Un épisode déjà lu lors d'une lecture précédente (marge de 7 jours) n'est pas relu par l'IA : pas de coût en double.
        podcast.lastFetchedAt && episode.publishedAt && episode.publishedAt < podcast.lastFetchedAt ? [] : await readWithAi(episode.title, episode.description, sourceUrl), catalog);
      for (const found of scan.found) {
        const codeId = await addPodcastCode(db, {
          toolId: found.toolId, creatorId, code: found.code, discount: found.discount, sourceUrl, sourceTitle: episode.title,
          note: `Trouvé dans le podcast ${podcast.title} : « ${found.evidence} »`, podcastTitle: podcast.title, expiresOn: found.expiresOn,
        });
        if (!codeId) continue;
        report.found.push({ podcast: podcast.title, code: found.code, tool: toolName.get(found.toolId) ?? '' });
        // Le dossier est préparé tout de suite : score, preuve et, si elle est active, lecture par l'IA.
        if (options.deps) await runVerification(db, codeId, options.deps).catch(error => console.error('podcast code verification failed', error));
      }
      // Outil absent du catalogue : une suggestion, une seule fois par outil et par code (même ignorée).
      for (const item of scan.unknown) {
        const inserted = await db.insert(toolSuggestions).values({
          name: item.name.slice(0, 120), domain: item.domain, code: item.code, discount: item.discount, evidence: item.evidence,
          sourceUrl, sourceTitle: episode.title.slice(0, 300), podcastId: podcast.id, creatorId,
        }).onConflictDoNothing().returning({ id: toolSuggestions.id });
        if (inserted.length) report.suggested.push({ podcast: podcast.title, code: item.code, tool: item.domain ?? item.name });
      }
    }
    await db.update(watchedSources).set({ lastFetchedAt: now, ...(podcast.creatorId ? {} : { creatorId }) }).where(eq(watchedSources.id, podcast.id));
  }
  return report;
}
