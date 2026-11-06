// Client de l'annuaire Apple Podcasts (iTunes Search API) : gratuit, sans clé ni inscription.
// Il sert à chercher un podcast et à lire les notes de ses derniers épisodes, où les créateurs donnent leurs codes.
// Limite d'Apple : une vingtaine d'appels par minute, largement assez pour l'admin et la lecture de nuit.

import { withTimeout } from './timeout-fetch';

const API = 'https://itunes.apple.com';
/** Boutique interrogée : la française trouve aussi les podcasts en anglais. */
const COUNTRY = 'FR';

export type PodcastFeed = { id: number; title: string; author: string; feedUrl: string; link: string; image: string; episodeCount: number; genre: string };
export type PodcastEpisode = { id: number; title: string; link: string; description: string; publishedAt: Date | null };

export type PodcastDirectory = {
  search(term: string): Promise<PodcastFeed[]>;
  podcast(id: number): Promise<PodcastFeed | null>;
  /** Plusieurs podcasts en un appel (jusqu'à 100 identifiants), pour afficher leurs images. */
  podcasts(ids: number[]): Promise<PodcastFeed[]>;
  /** Derniers épisodes, du plus récent au plus ancien. */
  episodes(podcastId: number, options?: { max?: number }): Promise<PodcastEpisode[]>;
  /** Classement Apple Podcasts d'un genre (boutique française), du premier au dernier. */
  top?(genreId: number, limit?: number): Promise<PodcastFeed[]>;
};

/** Genres proposés pour découvrir des podcasts : ceux où les sponsors donnent le plus de codes d'outils. */
export const TOP_GENRES = [
  { id: 1493, label: 'Entrepreneuriat' },
  { id: 1321, label: 'Affaires' },
  { id: 1318, label: 'Technologies' },
  { id: 1412, label: 'Investissement' },
  { id: 1492, label: 'Marketing' },
] as const;

type ChartEntry = {
  'im:name'?: { label?: string }; 'im:artist'?: { label?: string }; 'im:image'?: { label?: string }[];
  id?: { label?: string; attributes?: { 'im:id'?: string } }; category?: { attributes?: { label?: string } };
};

/** Une entrée du classement (flux RSS JSON d'Apple) en podcast, null si elle est incomplète. */
export function chartEntryToFeed(entry: ChartEntry): PodcastFeed | null {
  const id = Number(entry.id?.attributes?.['im:id']);
  const title = entry['im:name']?.label?.trim();
  if (!Number.isSafeInteger(id) || id <= 0 || !title) return null;
  const images = entry['im:image'] ?? [];
  return {
    id, title: title.slice(0, 200), author: (entry['im:artist']?.label ?? '').trim().slice(0, 160), feedUrl: '',
    link: https(entry.id?.label?.replace(/\?uo=\d+$/, '')), image: https(images[images.length - 1]?.label), episodeCount: 0,
    genre: entry.category?.attributes?.label ?? '',
  };
}

type RawResult = {
  wrapperType?: string; kind?: string;
  collectionId?: number; collectionName?: string; artistName?: string; feedUrl?: string; collectionViewUrl?: string;
  artworkUrl600?: string; artworkUrl100?: string; trackCount?: number; primaryGenreName?: string;
  trackId?: number; trackName?: string; trackViewUrl?: string; description?: string; shortDescription?: string; releaseDate?: string;
};

const https = (value: string | undefined) => (value && /^https?:\/\//i.test(value) ? value : '');

function toFeed(raw: RawResult): PodcastFeed | null {
  if (raw.kind !== 'podcast' || !raw.collectionId || !raw.collectionName) return null;
  return {
    id: raw.collectionId, title: raw.collectionName.trim().slice(0, 200), author: (raw.artistName ?? '').trim().slice(0, 160),
    feedUrl: https(raw.feedUrl), link: https(raw.collectionViewUrl), image: https(raw.artworkUrl600 || raw.artworkUrl100),
    episodeCount: raw.trackCount ?? 0, genre: raw.primaryGenreName ?? '',
  };
}

function toEpisode(raw: RawResult): PodcastEpisode | null {
  if (raw.wrapperType !== 'podcastEpisode' || !raw.trackId || !raw.trackName) return null;
  const date = raw.releaseDate ? new Date(raw.releaseDate) : null;
  return {
    id: raw.trackId, title: raw.trackName.trim().slice(0, 300), link: https(raw.trackViewUrl),
    description: htmlToText(raw.description || raw.shortDescription || ''),
    publishedAt: date && !Number.isNaN(date.getTime()) ? date : null,
  };
}

/** Le HTML des notes d'épisode réduit à du texte, pour y chercher les codes. */
/**
 * Un podcast n'apparaît qu'une fois dans un classement : Apple liste parfois le même sous deux identifiants
 * (même nom, même auteur). On garde la première place.
 */
export function uniqueFeeds(feeds: PodcastFeed[]): PodcastFeed[] {
  const key = (value: string | null | undefined) => (value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const ids = new Set<number>();
  const names = new Set<string>();
  return feeds.filter(feed => {
    const name = `${key(feed.title)}|${key(feed.author)}`;
    if (ids.has(feed.id) || names.has(name)) return false;
    ids.add(feed.id);
    names.add(name);
    return true;
  });
}

export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/li|\/div)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ').replace(/ *\n\s*/g, '\n').trim();
}

export function applePodcasts(fetchFn: typeof fetch = withTimeout()): PodcastDirectory {
  const get = async (path: string, params: Record<string, string>): Promise<RawResult[]> => {
    const response = await fetchFn(`${API}${path}?${new URLSearchParams({ ...params, country: COUNTRY })}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Apple Podcasts ${path} ${response.status}`);
    const body = await response.json() as { results?: RawResult[] };
    return body.results ?? [];
  };
  return {
    async search(term) {
      const results = await get('/search', { media: 'podcast', entity: 'podcast', term, limit: '10' });
      return results.map(toFeed).filter((feed): feed is PodcastFeed => feed !== null);
    },
    async podcast(id) {
      const results = await get('/lookup', { id: String(id) });
      return results.map(toFeed).find((feed): feed is PodcastFeed => feed !== null) ?? null;
    },
    async podcasts(ids) {
      const unique = [...new Set(ids)].filter(id => Number.isSafeInteger(id) && id > 0).slice(0, 100);
      if (unique.length === 0) return [];
      const results = await get('/lookup', { id: unique.join(',') });
      return results.map(toFeed).filter((feed): feed is PodcastFeed => feed !== null);
    },
    async top(genreId, limit = 50) {
      const n = Math.min(Math.max(Math.trunc(limit), 1), 100);
      const response = await fetchFn(`${API}/${COUNTRY.toLowerCase()}/rss/toppodcasts/limit=${n}/genre=${Math.trunc(genreId)}/json`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Apple Podcasts top ${response.status}`);
      const body = await response.json() as { feed?: { entry?: ChartEntry[] | ChartEntry } };
      const entries = body.feed?.entry;
      const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
      return uniqueFeeds(list.map(chartEntryToFeed).filter((feed): feed is PodcastFeed => feed !== null));
    },
    async episodes(podcastId, options = {}) {
      const results = await get('/lookup', { id: String(podcastId), entity: 'podcastEpisode', limit: String(options.max ?? 20) });
      return results.map(toEpisode).filter((episode): episode is PodcastEpisode => episode !== null)
        .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
    },
  };
}

/** Identifiants d'un épisode dans un lien Apple Podcasts (…/id123?i=456), null pour un autre lien. */
export function appleEpisodeRef(url: string): { podcastId: number; episodeId: number } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'podcasts.apple.com') return null;
    const podcastId = Number(parsed.pathname.match(/\/id(\d+)\/?$/)?.[1]);
    const episodeId = Number(parsed.searchParams.get('i'));
    return Number.isSafeInteger(podcastId) && podcastId > 0 && Number.isSafeInteger(episodeId) && episodeId > 0 ? { podcastId, episodeId } : null;
  } catch {
    return null;
  }
}

/** Relit les notes d'un épisode Apple Podcasts pour les vérifications. null si le lien n'en est pas un ou si l'épisode est trop ancien. */
export function podcastReader(directory: PodcastDirectory): (url: string) => Promise<{ online: boolean; title: string; description: string } | null> {
  return async url => {
    const ref = appleEpisodeRef(url);
    if (!ref) return null;
    const [podcast, episodes] = await Promise.all([directory.podcast(ref.podcastId), directory.episodes(ref.podcastId, { max: 200 })]);
    if (!podcast) return { online: false, title: '', description: '' };
    const episode = episodes.find(item => item.id === ref.episodeId);
    return episode ? { online: true, title: episode.title, description: episode.description } : null;
  };
}
