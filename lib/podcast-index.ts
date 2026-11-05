// Podcasts candidats trouvés dans la base publique de Podcast Index (ADR-0036). Le script de la GitHub Action
// (scripts/podcast-index-candidates.ts) choisit les podcasts actifs de la base, lit leurs flux RSS et y cherche
// les outils du catalogue près d'un mot comme « code » ou « promo », avec le même repérage que les podcasts suivis.
// Merkod ne reçoit que la liste des candidats : l'admin décide qui suivre. Sans base ni réseau ici.
import { htmlToText } from './apple-podcasts';
import { findPromoCodes, type CatalogTool } from './podcast-codes';

export const PODCAST_INDEX_DUMP_URL = 'https://public.podcastindex.org/podcastindex_feeds.db.tgz';
/** Un podcast est actif s'il a publié un épisode dans ces jours-là ; seuls ces épisodes sont lus. */
export const ACTIVE_DAYS = 90;
/** Noms en français des catégories de Podcast Index les plus courantes, pour l'admin. Toutes les catégories sont lues. */
export const CATEGORY_LABELS: Record<string, string> = {
  Technology: 'Technologie', Business: 'Business', Education: 'Éducation', Comedy: 'Humour', Society: 'Société', Culture: 'Culture',
  News: 'Actualités', Health: 'Santé', Fitness: 'Forme', Sports: 'Sport', Arts: 'Arts', Science: 'Sciences', Games: 'Jeux vidéo',
  Leisure: 'Loisirs', Music: 'Musique', Tv: 'Séries et films', Film: 'Cinéma', History: 'Histoire', Religion: 'Religion',
  Spirituality: 'Spiritualité', Kids: 'Enfants', Family: 'Famille', Fiction: 'Fiction', True: 'Faits divers', Crime: 'Faits divers', Government: 'Politique',
};
export const CANDIDATE_LANGUAGES = ['fr', 'en'] as const;
/** Podcasts lus au plus par passage (les plus populaires d'abord), candidats et outils gardés au plus par envoi. */
export const MAX_FEEDS = 10_000;
export const MAX_CANDIDATES = 500;
export const MAX_HITS = 5;

export type CandidateHit = { toolId: string; code: string; evidence: string; episodeTitle: string; episodeUrl: string | null; publishedAt: string | null };
export type CandidateInput = {
  itunesId: string; podcastIndexId: number; title: string; author: string; feedUrl: string; imageUrl: string | null;
  language: string; category: string; episodeCount: number; newestEpisodeAt: string | null; hits: CandidateHit[];
};

/**
 * La requête SQLite qui choisit les podcasts à lire dans la base : vivants, connus d'Apple (pour pouvoir les suivre),
 * actifs depuis 90 jours, en français ou en anglais, toutes catégories. Les plus populaires d'abord. Le vrai tri vient
 * ensuite : un podcast n'est gardé que s'il cite un outil du catalogue près d'un code.
 */
export function candidateQuery(now: Date, limit = MAX_FEEDS): { sql: string; params: (string | number)[] } {
  const since = Math.floor(now.getTime() / 1000) - ACTIVE_DAYS * 86_400;
  return {
    sql: `select id, url, title, itunesId, itunesAuthor, imageUrl, language, episodeCount, newestItemPubdate, category1, category2, category3
      from podcasts
      where dead = 0 and itunesId > 0 and newestItemPubdate >= ? and episodeCount >= 3
        and (lower(language) like 'fr%' or lower(language) like 'en%')
      order by popularityScore desc, newestItemPubdate desc
      limit ?`,
    params: [since, limit],
  };
}

/** La première catégorie d'une ligne de la base, en français quand on connaît sa traduction. */
export function categoryOf(row: Record<string, unknown>): string {
  for (let index = 1; index <= 3; index++) {
    const name = String(row[`category${index}`] ?? '').trim();
    if (name) return (CATEGORY_LABELS[name] ?? name).slice(0, 40);
  }
  return '';
}

/** Un podcast à lire, qu'il vienne de la base téléchargée ou de l'API de Podcast Index. */
export type IndexFeed = { id: number; url: string; title: string; itunesId: string; author: string; imageUrl: string | null; language: string; episodeCount: number; newestAt: string | null; category: string };

const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const unixToIso = (value: unknown) => (num(value) > 0 ? new Date(num(value) * 1000).toISOString() : null);

/** Une ligne de la base téléchargée (requête candidateQuery). */
export function dumpRowToFeed(row: Record<string, unknown>): IndexFeed {
  return {
    id: num(row.id), url: String(row.url ?? ''), title: String(row.title ?? '').trim() || 'Sans titre', itunesId: String(row.itunesId ?? ''),
    author: String(row.itunesAuthor ?? ''), imageUrl: row.imageUrl ? String(row.imageUrl) : null, language: String(row.language ?? ''),
    episodeCount: num(row.episodeCount), newestAt: unixToIso(row.newestItemPubdate), category: categoryOf(row),
  };
}

/**
 * Un podcast renvoyé par l'API de Podcast Index (tendances, flux récents), avec les mêmes conditions que la base :
 * connu d'Apple, en français ou en anglais, actif depuis 90 jours. null sinon.
 */
export function apiFeedToFeed(feed: Record<string, unknown>, now: Date): IndexFeed | null {
  const itunesId = num(feed.itunesId);
  const url = String(feed.url ?? '');
  const language = String(feed.language ?? '').toLowerCase();
  const newest = num(feed.newestItemPublishTime ?? feed.newestItemPubdate);
  if (itunesId <= 0 || !/^https?:\/\//i.test(url) || !/^(fr|en)/.test(language)) return null;
  if (newest * 1000 < now.getTime() - ACTIVE_DAYS * 86_400_000) return null;
  const categories = feed.categories && typeof feed.categories === 'object' ? Object.values(feed.categories as Record<string, unknown>).map(String) : [];
  return {
    id: num(feed.id), url, title: String(feed.title ?? '').trim() || 'Sans titre', itunesId: String(itunesId), author: String(feed.author ?? ''),
    imageUrl: String(feed.artwork || feed.image || '') || null, language, episodeCount: num(feed.episodeCount), newestAt: unixToIso(newest),
    category: categories[0] ? (CATEGORY_LABELS[categories[0]] ?? categories[0]).slice(0, 40) : '',
  };
}

export type FeedItem = { title: string; link: string | null; text: string; publishedAt: Date | null };

const tag = (xml: string, name: string): string | null => {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  if (!match) return null;
  return match[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
};

/** Les épisodes d'un flux RSS : titre, lien, notes réduites à du texte, date. Les plus longues notes l'emportent. */
export function parseFeedItems(xml: string): FeedItem[] {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(([, item]) => {
    const notes = ['content:encoded', 'description', 'itunes:summary'].map(name => tag(item, name) ?? '').sort((a, b) => b.length - a.length)[0];
    const date = tag(item, 'pubDate');
    const parsed = date ? new Date(date) : null;
    const link = tag(item, 'link');
    return {
      title: htmlToText(tag(item, 'title') ?? '').slice(0, 200),
      link: link && /^https?:\/\//i.test(link) ? link.slice(0, 500) : null,
      text: htmlToText(notes),
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed : null,
    };
  });
}

/** Les codes d'outils du catalogue cités dans les épisodes des 90 derniers jours, un par outil, les plus récents d'abord. */
export function scanFeed(items: FeedItem[], tools: CatalogTool[], now: Date): CandidateHit[] {
  const since = now.getTime() - ACTIVE_DAYS * 86_400_000;
  const hits: CandidateHit[] = [];
  const recent = items.filter(item => item.publishedAt && item.publishedAt.getTime() >= since)
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  for (const item of recent) {
    for (const found of findPromoCodes(item.text, tools)) {
      if (hits.some(hit => hit.toolId === found.toolId)) continue;
      hits.push({ toolId: found.toolId, code: found.code, evidence: found.evidence, episodeTitle: item.title, episodeUrl: item.link, publishedAt: item.publishedAt?.toISOString() ?? null });
      if (hits.length >= MAX_HITS) return hits;
    }
  }
  return hits;
}

const str = (value: unknown, max: number): string | null => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);
const isoOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Relit côté serveur la liste envoyée par le script : champs bornés, identifiant Apple numérique, flux en http(s),
 * outils du catalogue seulement (toolIds connus). Une entrée invalide est écartée, pas toute la liste.
 */
export function parseCandidates(value: unknown, toolIds: Set<string>): CandidateInput[] {
  if (!Array.isArray(value)) return [];
  const result: CandidateInput[] = [];
  for (const raw of value.slice(0, MAX_CANDIDATES)) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const itunesId = String(row.itunesId ?? '');
    const title = str(row.title, 200);
    const feedUrl = str(row.feedUrl, 500);
    if (!/^\d{1,15}$/.test(itunesId) || !title || !feedUrl || !/^https?:\/\//i.test(feedUrl)) continue;
    const hits = (Array.isArray(row.hits) ? row.hits : []).slice(0, MAX_HITS).flatMap((item): CandidateHit[] => {
      if (!item || typeof item !== 'object') return [];
      const hit = item as Record<string, unknown>;
      const toolId = String(hit.toolId ?? '');
      const code = str(hit.code, 60);
      if (!UUID.test(toolId) || !toolIds.has(toolId) || !code) return [];
      const episodeUrl = str(hit.episodeUrl, 500);
      return [{ toolId, code, evidence: str(hit.evidence, 300) ?? '', episodeTitle: str(hit.episodeTitle, 200) ?? '',
        episodeUrl: episodeUrl && /^https?:\/\//i.test(episodeUrl) ? episodeUrl : null, publishedAt: isoOrNull(hit.publishedAt) }];
    });
    if (!hits.length) continue;
    const imageUrl = str(row.imageUrl, 500);
    result.push({
      itunesId, title, feedUrl, hits,
      podcastIndexId: Number.isSafeInteger(row.podcastIndexId) ? Number(row.podcastIndexId) : 0,
      author: str(row.author, 200) ?? '',
      imageUrl: imageUrl && /^https:\/\//i.test(imageUrl) ? imageUrl : null,
      language: (str(row.language, 10) ?? '').toLowerCase(),
      category: str(row.category, 40) ?? '',
      episodeCount: Number.isSafeInteger(row.episodeCount) && Number(row.episodeCount) >= 0 ? Number(row.episodeCount) : 0,
      newestEpisodeAt: isoOrNull(row.newestEpisodeAt),
    });
  }
  return result;
}
