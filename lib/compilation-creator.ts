// Vidéos « compilation » (ADR-0042) : une chaîne liste les codes d'autres créateurs (« 2. Saily — code NOZMAN (Dr Nozman) »).
// Le code est crédité au créateur nommé dans la description, pas à la chaîne qui fait la liste. On le cherche d'abord
// en base (par son nom), puis par sa chaîne YouTube (une recherche de 100 unités, seulement pour un nom inconnu).
// La vidéo de la compilation ne prouve pas que le créateur donne ce code : le code reste en attente, avec une note,
// et l'analyse ne le classe jamais « clair ».
import { and, eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { creatorAccounts, creators } from '@/db/schema';
import { youtubeFetch } from './api-usage';
import { resolveCreator } from './codes-admin';
import { youtubeBatch, type YoutubeBatch } from './creator-youtube-link';
import { slugify } from './slug';

export { compilationNote } from './compilation-note';

/** Une recherche de chaîne par nom coûte 100 unités du quota YouTube. */
export const CHANNEL_SEARCH_UNITS = 100;

export type FoundChannel = { id: string; title: string };

export type CreatorFinder = {
  /** Chaînes YouTube dont le nom ressemble à la recherche (100 unités). */
  searchChannels(name: string): Promise<FoundChannel[]>;
  /** Pseudo, adresse et abonnés des chaînes (1 unité par lot de 50). */
  channels: YoutubeBatch['channels'];
};

/** Recherche de chaînes par l'API officielle de YouTube. null sans clé. */
export function creatorFinder(apiKey: string | undefined, fetchFn: typeof fetch = youtubeFetch): CreatorFinder | null {
  const batch = youtubeBatch(apiKey, fetchFn);
  if (!apiKey || !batch) return null;
  return {
    async searchChannels(name) {
      const query = new URLSearchParams({ part: 'snippet', type: 'channel', q: name, maxResults: '5', key: apiKey });
      const response = await fetchFn(`https://www.googleapis.com/youtube/v3/search?${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`YouTube API search ${response.status}`);
      const body = await response.json() as { items?: { id?: { channelId?: string }; snippet?: { channelTitle?: string; title?: string } }[] };
      return (body.items ?? []).map(item => ({ id: item.id?.channelId ?? '', title: item.snippet?.channelTitle || item.snippet?.title || '' })).filter(item => item.id && item.title);
    },
    channels: batch.channels,
  };
}

const plain = (value: string) => slugify(value).replace(/-/g, '');

/** Le nom crédité désigne-t-il la chaîne qui a publié la vidéo ? (« Nozman » dans une vidéo de « Dr Nozman ») */
export function sameCreator(credited: string, channelTitle: string): boolean {
  const a = plain(credited);
  const b = plain(channelTitle);
  if (!a || !b) return false;
  // Un petit ajout seulement (« Dr », « TV », « FR ») : « Les codes de Nozman » n'est pas « Nozman ».
  return a === b || (Math.min(a.length, b.length) >= 4 && Math.abs(a.length - b.length) <= 4 && (a.includes(b) || b.includes(a)));
}

export type CreditedCreator = { creatorId: string; name: string; units: number };

/**
 * Le créateur à créditer pour un code d'une vidéo dont l'auteur est channelTitle. null quand le code n'est pas
 * attribué à quelqu'un d'autre (pas de nom, ou le nom de la chaîne elle-même). cache évite deux recherches pour
 * le même nom dans un passage.
 */
export async function creditedCreator(db: Db, finder: CreatorFinder | null, credited: string | undefined, channelTitle: string, cache: Map<string, CreditedCreator>, now = new Date()): Promise<CreditedCreator | null> {
  const name = credited?.trim() ?? '';
  if (!name || !slugify(name) || sameCreator(name, channelTitle)) return null;
  const key = slugify(name);
  const cached = cache.get(key);
  if (cached) return { ...cached, units: 0 };
  const done = (result: CreditedCreator) => { cache.set(key, result); return result; };

  // 1. Déjà en base sous ce nom : pas de recherche.
  const [known] = await db.select({ id: creators.id, name: creators.name }).from(creators).where(eq(creators.slug, key)).limit(1);
  if (known) return done({ creatorId: known.id, name: known.name, units: 0 });

  // 2. Sa chaîne YouTube, si le nom écrit correspond à une chaîne trouvée.
  if (finder) {
    try {
      // Seulement une chaîne qui porte ce nom, pas « une chaîne qui en parle ».
      const channel = (await finder.searchChannels(name)).find(item => sameCreator(name, item.title));
      if (channel) {
        const [owner] = await db.select({ id: creators.id, name: creators.name }).from(creatorAccounts)
          .innerJoin(creators, eq(creators.id, creatorAccounts.creatorId))
          .where(and(eq(creatorAccounts.platform, 'youtube'), eq(creatorAccounts.externalId, channel.id))).limit(1);
        if (owner) return done({ creatorId: owner.id, name: owner.name, units: CHANNEL_SEARCH_UNITS });
        // Le nom exact de la chaîne, tel que YouTube le donne.
        const creatorId = await resolveCreator(db, channel.title);
        const info = (await finder.channels([channel.id])).get(channel.id);
        if (info) {
          await db.insert(creatorAccounts).values({
            creatorId, platform: 'youtube', externalId: info.id, handle: info.handle, url: info.url,
            subscribers: info.subscribers, subscribersAt: now, ...(info.metrics ? { metrics: info.metrics, metricsAt: now } : {}),
          }).onConflictDoNothing();
        }
        return done({ creatorId, name: channel.title, units: CHANNEL_SEARCH_UNITS + (info ? 1 : 0) });
      }
      // Rien de sûr : le créateur est créé par son nom, sans chaîne. L'admin la reliera.
      return done({ creatorId: await resolveCreator(db, name), name, units: CHANNEL_SEARCH_UNITS });
    } catch (error) {
      console.error('compilation creator search failed', name, error);
    }
  }
  return done({ creatorId: await resolveCreator(db, name), name, units: 0 });
}
