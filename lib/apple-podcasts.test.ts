import { describe, expect, it, vi } from 'vitest';
import { appleEpisodeRef, applePodcasts, htmlToText, podcastReader } from './apple-podcasts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('htmlToText', () => {
  it('garde le texte, les retours à la ligne et décode les entités', () => {
    expect(htmlToText('<p>Code <b>KOUPI</b> &amp; -20&nbsp;%</p><p>Lien : &lt;ici&gt; &#233;t&#233;</p>')).toBe('Code KOUPI & -20 %\nLien : <ici> été');
  });
  it('ne décode pas deux fois', () => {
    expect(htmlToText('&amp;lt;b&amp;gt;')).toBe('&lt;b&gt;');
  });
});

describe('applePodcasts', () => {
  it('cherche des podcasts dans la boutique française et ignore ce qui n’en est pas', async () => {
    const fetchFn = vi.fn(async (_url: string) => json({ results: [
      { kind: 'podcast', collectionId: 42, collectionName: ' Silicon Carne ', artistName: 'Carlos', feedUrl: 'https://feed.example/rss', collectionViewUrl: 'https://podcasts.apple.com/fr/podcast/id42', artworkUrl600: 'https://img.example/a.jpg', trackCount: 300, primaryGenreName: 'Technologies' },
      { kind: 'song', collectionId: 7, collectionName: 'Pas un podcast' },
      { kind: 'podcast', collectionId: 43, collectionName: 'Sans liens', feedUrl: 'javascript:alert(1)' },
    ] }));
    const feeds = await applePodcasts(fetchFn as unknown as typeof fetch).search('silicon carne');
    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('term')).toBe('silicon carne');
    expect(url.searchParams.get('media')).toBe('podcast');
    expect(url.searchParams.get('country')).toBe('FR');
    expect(feeds).toEqual([
      { id: 42, title: 'Silicon Carne', author: 'Carlos', feedUrl: 'https://feed.example/rss', link: 'https://podcasts.apple.com/fr/podcast/id42', image: 'https://img.example/a.jpg', episodeCount: 300, genre: 'Technologies' },
      { id: 43, title: 'Sans liens', author: '', feedUrl: '', link: '', image: '', episodeCount: 0, genre: '' },
    ]);
  });

  it('relit un podcast par son identifiant, null s’il n’existe plus', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(json({ results: [{ kind: 'podcast', collectionId: 42, collectionName: 'Silicon Carne' }] }))
      .mockResolvedValueOnce(json({ results: [] }));
    const directory = applePodcasts(fetchFn as unknown as typeof fetch);
    expect((await directory.podcast(42))?.title).toBe('Silicon Carne');
    expect(await directory.podcast(99)).toBeNull();
  });

  it('relit plusieurs podcasts en un seul appel, sans appel s’il n’y en a aucun', async () => {
    const fetchFn = vi.fn(async (_url: string) => json({ results: [
      { kind: 'podcast', collectionId: 42, collectionName: 'A', artworkUrl600: 'https://img.example/a.jpg' },
      { kind: 'podcast', collectionId: 43, collectionName: 'B' },
    ] }));
    const directory = applePodcasts(fetchFn as unknown as typeof fetch);
    expect(await directory.podcasts([])).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
    const feeds = await directory.podcasts([42, 43, 42]);
    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.get('id')).toBe('42,43');
    expect(feeds.map(feed => feed.image)).toEqual(['https://img.example/a.jpg', '']);
  });

  it('lit les derniers épisodes avec leurs notes en texte, du plus récent au plus ancien', async () => {
    const fetchFn = vi.fn(async (_url: string) => json({ results: [
      { wrapperType: 'track', kind: 'podcast', collectionId: 42, collectionName: 'Silicon Carne' },
      { wrapperType: 'podcastEpisode', trackId: 1, trackName: 'Ancien', releaseDate: '2026-10-01T05:00:00Z', description: '<p>Rien</p>', trackViewUrl: 'https://podcasts.apple.com/fr/podcast/id42?i=1' },
      { wrapperType: 'podcastEpisode', trackId: 2, trackName: 'Récent', releaseDate: '2026-10-20T05:00:00Z', shortDescription: 'Code KOUPI10' },
    ] }));
    const episodes = await applePodcasts(fetchFn as unknown as typeof fetch).episodes(42, { max: 5 });
    const url = new URL(fetchFn.mock.calls[0][0]);
    expect(url.searchParams.get('entity')).toBe('podcastEpisode');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(episodes.map(episode => episode.title)).toEqual(['Récent', 'Ancien']);
    expect(episodes[0]).toMatchObject({ id: 2, description: 'Code KOUPI10', link: '' });
    expect(episodes[1].publishedAt?.toISOString()).toBe('2026-10-01T05:00:00.000Z');
  });

  it('signale une erreur de l’annuaire', async () => {
    const fetchFn = vi.fn(async (_url: string) => json({}, 503));
    await expect(applePodcasts(fetchFn as unknown as typeof fetch).search('x')).rejects.toThrow('503');
  });
});

describe('podcastReader', () => {
  const directory = (podcast: boolean) => ({
    search: vi.fn(),
    podcast: vi.fn(async () => (podcast ? { id: 42, title: 'P', author: '', feedUrl: '', link: '', image: '', episodeCount: 1, genre: '' } : null)),
    podcasts: vi.fn(),
    episodes: vi.fn(async () => [{ id: 7, title: 'Épisode 7', link: '', description: 'Code KOUPI', publishedAt: null }]),
  });

  it('lit l’identifiant d’un épisode dans un lien Apple', () => {
    expect(appleEpisodeRef('https://podcasts.apple.com/fr/podcast/silicon-carne/id42?i=7')).toEqual({ podcastId: 42, episodeId: 7 });
    expect(appleEpisodeRef('https://podcasts.apple.com/podcast/id42')).toBeNull();
    expect(appleEpisodeRef('https://www.youtube.com/watch?v=abc')).toBeNull();
  });

  it('rend les notes de l’épisode, hors ligne si le podcast a disparu, null sinon', async () => {
    expect(await podcastReader(directory(true))('https://podcasts.apple.com/podcast/id42?i=7')).toEqual({ online: true, title: 'Épisode 7', description: 'Code KOUPI' });
    expect(await podcastReader(directory(true))('https://podcasts.apple.com/podcast/id42?i=8')).toBeNull();
    expect(await podcastReader(directory(false))('https://podcasts.apple.com/podcast/id42?i=7')).toEqual({ online: false, title: '', description: '' });
    expect(await podcastReader(directory(true))('https://example.com')).toBeNull();
  });
});
