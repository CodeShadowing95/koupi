import { describe, expect, it } from 'vitest';
import { audienceLine, cleanMetrics, mergeMetrics, metricParts } from './account-metrics';

describe('mesures d’audience', () => {
  it('ne garde que les mesures valides', () => {
    expect(cleanMetrics({ rating: 4.666, ratingCount: 5281, ratingSource: ' Apple Podcasts ', episodes: 1100, views: -3, videos: 1.5, extra: 'x' }))
      .toEqual({ rating: 4.67, ratingCount: 5281, ratingSource: 'Apple Podcasts', episodes: 1100 });
    expect(cleanMetrics({ rating: 7 })).toEqual({});
    expect(cleanMetrics({ ratingCount: 12 })).toEqual({});
    expect(cleanMetrics(null)).toEqual({});
    expect(cleanMetrics([1, 2])).toEqual({});
  });

  it('une lecture partielle n’efface pas les anciennes mesures', () => {
    expect(mergeMetrics({ rating: 4.5, ratingCount: 10, episodes: 80 }, { episodes: 82 })).toEqual({ rating: 4.5, ratingCount: 10, episodes: 82 });
  });

  it('garde le pays et la langue, et ceux corrigés à la main', () => {
    expect(cleanMetrics({ country: 'fr', language: 'fr-FR' })).toEqual({ country: 'FR', language: 'fr' });
    expect(cleanMetrics({ country: 'France', language: 'français' })).toEqual({});
    expect(mergeMetrics({ country: 'BE', language: 'fr', localeManual: true }, { country: 'FR', language: 'en', episodes: 3 }))
      .toEqual({ country: 'BE', language: 'fr', localeManual: true, episodes: 3 });
    expect(mergeMetrics({ country: 'BE' }, { country: 'FR' })).toEqual({ country: 'FR' });
  });

  it('écrit la ligne d’audience', () => {
    expect(metricParts({ rating: 4.7, ratingCount: 5281, episodes: 1100 })).toEqual(['4,7 ★', '5 281 notes', '1 100 épisodes']);
    expect(metricParts({ rating: 5, ratingCount: 1, episodes: 1 })).toEqual(['5,0 ★', '1 note', '1 épisode']);
    expect(audienceLine('12 400 abonnés', { views: 2_000_000, videos: 150 })).toBe('12 400 abonnés · 2 000 000 vues · 150 vidéos');
    expect(audienceLine(null, {})).toBeNull();
  });
});
