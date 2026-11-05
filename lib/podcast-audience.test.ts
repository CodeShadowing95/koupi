import { describe, expect, it } from 'vitest';
import { applePodcastId, podcastAudienceReader } from './podcast-audience';
import type { PodcastFeed } from './apple-podcasts';

const feed = (episodeCount: number): PodcastFeed => ({ id: 1209142994, title: 'GDIY', author: 'Matthieu Stefani', feedUrl: '', link: '', image: '', episodeCount, genre: 'Business' });
const account = { externalId: '1209142994', url: 'https://podcasts.apple.com/fr/podcast/gdiy/id1209142994' };

describe('audience d’un podcast', () => {
  it('trouve l’identifiant Apple dans le compte ou son lien', () => {
    expect(applePodcastId(account)).toBe(1209142994);
    expect(applePodcastId({ externalId: null, url: 'https://podcasts.apple.com/fr/podcast/gdiy/id42' })).toBe(42);
    expect(applePodcastId({ externalId: null, url: 'https://open.spotify.com/show/abc' })).toBeNull();
  });

  it('réunit les épisodes et la note Apple', async () => {
    const read = podcastAudienceReader({ directory: { podcast: async () => feed(1100) }, readRating: async () => ({ rating: 4.7, ratingCount: 5281 }) });
    expect(await read(account)).toEqual({ episodes: 1100, rating: 4.7, ratingCount: 5281, ratingSource: 'Apple Podcasts' });
  });

  it('garde les épisodes si la note ne se lit plus', async () => {
    const read = podcastAudienceReader({ directory: { podcast: async () => feed(80) }, readRating: async () => { throw new Error('page changée'); } });
    expect(await read(account)).toEqual({ episodes: 80 });
  });

  it('rend null pour un podcast disparu, lève une erreur si Apple ne répond pas du tout', async () => {
    const gone = podcastAudienceReader({ directory: { podcast: async () => null }, readRating: async () => null });
    expect(await gone(account)).toBeNull();
    expect(await gone({ externalId: null, url: 'https://example.com' })).toBeNull();
    const down = podcastAudienceReader({ directory: { podcast: async () => { throw new Error('503'); } }, readRating: async () => { throw new Error('503'); } });
    await expect(down(account)).rejects.toThrow('503');
  });
});
