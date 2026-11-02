// Client de l'annuaire Apple Podcasts (iTunes Search API) : gratuit, sans clé ni inscription.
// Il sert à chercher un podcast et à lire les notes de ses derniers épisodes, où les créateurs donnent leurs codes.
// Limite d'Apple : une vingtaine d'appels par minute, largement assez pour l'admin et la lecture de nuit.

const API = 'https://itunes.apple.com';
/** Boutique interrogée : la française trouve aussi les podcasts en anglais. */
const COUNTRY = 'FR';

export type PodcastFeed = { id: number; title: string; author: string; feedUrl: string; link: string; image: string; episodeCount: number; genre: string };
export type PodcastEpisode = { id: number; title: string; link: string; description: string; publishedAt: Date | null };

export type PodcastDirectory = {
  search(term: string): Promise<PodcastFeed[]>;
  podcast(id: number): Promise<PodcastFeed | null>;
  /** Derniers épisodes, du plus récent au plus ancien. */
  episodes(podcastId: number, options?: { max?: number }): Promise<PodcastEpisode[]>;
};

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
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/li|\/div)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ').replace(/ *\n\s*/g, '\n').trim();
}

export function applePodcasts(fetchFn: typeof fetch = fetch): PodcastDirectory {
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
