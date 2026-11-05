// Audience d'un podcast Apple : nombre d'épisodes (API iTunes) et note sur 5 avec le nombre de notes (page publique).
// Les abonnés d'un podcast ne sont publics nulle part ; ces mesures les remplacent (ADR-0030).
import type { AccountMetrics } from './account-metrics';
import { applePodcasts, type PodcastDirectory } from './apple-podcasts';
import { fetchApplePodcastRating, type PodcastRating } from './apple-podcast-rating';
import type { AudienceReader } from './creator-accounts';
import { fetchFeedHead, type FeedHead } from './podcast-feed-head';
import { guessLanguage } from './language-guess';

/** Identifiant Apple d'un compte podcast : son externalId, sinon le …/id123 de son lien. */
export function applePodcastId(account: { externalId: string | null; url: string }): number | null {
  const fromId = Number(account.externalId);
  if (Number.isSafeInteger(fromId) && fromId > 0) return fromId;
  const fromUrl = Number(account.url.match(/podcasts\.apple\.com\/.*\/id(\d+)/)?.[1]);
  return Number.isSafeInteger(fromUrl) && fromUrl > 0 ? fromUrl : null;
}

type Sources = {
  directory?: Pick<PodcastDirectory, 'podcast'>;
  readRating?: (id: number) => Promise<PodcastRating | null>;
  /** Début du flux RSS : la langue de l'émission (<language>) et sa description. */
  readFeedHead?: (feedUrl: string) => Promise<FeedHead | null>;
};

/**
 * Lecteur d'audience des comptes podcast. Les deux lectures sont indépendantes : si la page Apple change et que
 * la note ne se lit plus, les épisodes sont quand même mis à jour (et l'ancienne note reste).
 */
export function podcastAudienceReader(sources: Sources = {}): AudienceReader {
  const directory = sources.directory ?? applePodcasts();
  const readRating = sources.readRating ?? (id => fetchApplePodcastRating(id));
  const readFeedHead = sources.readFeedHead ?? (url => fetchFeedHead(url));
  return async account => {
    const id = applePodcastId(account);
    if (id === null) return null;
    const [feed, rating] = await Promise.allSettled([directory.podcast(id), readRating(id)]);
    if (feed.status === 'rejected' && rating.status === 'rejected') throw feed.reason;
    if (feed.status === 'fulfilled' && feed.value === null && (rating.status === 'rejected' || rating.value === null)) return null;
    const metrics: AccountMetrics = {};
    if (feed.status === 'fulfilled' && feed.value && feed.value.episodeCount > 0) metrics.episodes = feed.value.episodeCount;
    if (rating.status === 'fulfilled' && rating.value) {
      metrics.rating = rating.value.rating;
      metrics.ratingSource = 'Apple Podcasts';
      if (rating.value.ratingCount !== null) metrics.ratingCount = rating.value.ratingCount;
    }
    // Langue : celle que le flux déclare, sinon devinée sur sa description et son titre.
    const podcast = feed.status === 'fulfilled' ? feed.value : null;
    if (podcast) {
      const head = podcast.feedUrl ? await readFeedHead(podcast.feedUrl).catch(() => null) : null;
      const language = head?.language ?? guessLanguage(`${podcast.title}. ${head?.description ?? ''}`);
      if (language) metrics.language = language;
    }
    return metrics;
  };
}
