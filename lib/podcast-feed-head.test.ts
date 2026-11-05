import { describe, expect, it, vi } from 'vitest';
import { fetchFeedHead, parseFeedHead } from './podcast-feed-head';

const FEED = `<?xml version="1.0"?><rss><channel><title>GDIY</title><language>fr-FR</language>
<description><![CDATA[<p>Le podcast qui <b>décortique</b> les parcours d'entrepreneurs.</p>]]></description>
<item><title>Épisode</title><description>Code PROMO10</description><language>en</language></item></channel></rss>`;

describe('début du flux RSS', () => {
  it('lit la langue et la description de l’émission, pas celles des épisodes', () => {
    expect(parseFeedHead(FEED)).toEqual({ language: 'fr', description: 'Le podcast qui décortique les parcours d’entrepreneurs.'.replace('’', '\'') });
    expect(parseFeedHead('<rss><channel><title>X</title></channel></rss>')).toEqual({ language: null, description: '' });
  });
  it('ne lit qu’un flux https public', async () => {
    const fetchFn = vi.fn(async () => new Response(FEED)) as unknown as typeof fetch;
    const publicDns = async () => ['93.184.216.34'];
    expect((await fetchFeedHead('https://feeds.audiomeans.fr/rss', { fetchFn, resolve: publicDns }))?.language).toBe('fr');
    expect(await fetchFeedHead('http://feeds.audiomeans.fr/rss', { fetchFn, resolve: publicDns })).toBeNull();
    expect(await fetchFeedHead('pas une adresse', { fetchFn, resolve: publicDns })).toBeNull();
    expect(await fetchFeedHead('https://intranet.audiomeans.fr/rss', { fetchFn, resolve: async () => ['10.0.0.4'] })).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  it('suit une redirection vers une adresse publique, pas vers une adresse privée', async () => {
    const hops = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 301, headers: { location: 'https://cdn.audiomeans.fr/rss' } }))
      .mockResolvedValueOnce(new Response(FEED));
    expect((await fetchFeedHead('https://feeds.audiomeans.fr/rss', { fetchFn: hops as unknown as typeof fetch, resolve: async () => ['93.184.216.34'] }))?.language).toBe('fr');
    const toLocal = vi.fn().mockResolvedValue(new Response('', { status: 302, headers: { location: 'https://localhost/rss' } }));
    expect(await fetchFeedHead('https://feeds.audiomeans.fr/rss', { fetchFn: toLocal as unknown as typeof fetch, resolve: async () => ['93.184.216.34'] })).toBeNull();
  });
});
