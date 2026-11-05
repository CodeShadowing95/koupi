import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { candidateQuery, categoryOf, parseCandidates, parseFeedItems, scanFeed } from './podcast-index';

const NOW = new Date('2026-11-05T12:00:00Z');
const daysAgo = (days: number) => Math.floor(NOW.getTime() / 1000) - days * 86_400;

describe('candidateQuery', () => {
  it('garde les podcasts vivants, connus d’Apple, actifs, en français ou en anglais, toutes catégories', () => {
    const db = new DatabaseSync(':memory:');
    const categories = Array.from({ length: 10 }, (_, i) => `category${i + 1} TEXT NOT NULL DEFAULT ''`).join(', ');
    db.exec(`CREATE TABLE podcasts (id INTEGER PRIMARY KEY, url TEXT, title TEXT, itunesId INTEGER, itunesAuthor TEXT, imageUrl TEXT, language TEXT,
      episodeCount INTEGER, newestItemPubdate INTEGER, popularityScore INTEGER, dead INTEGER, ${categories})`);
    const insert = db.prepare('INSERT INTO podcasts (id, title, itunesId, language, episodeCount, newestItemPubdate, popularityScore, dead, category1, category3) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insert.run(1, 'Bon, populaire', 11, 'fr-FR', 50, daysAgo(3), 9, 0, 'Arts', 'Technology');
    insert.run(2, 'Bon', 12, 'en', 20, daysAgo(10), 2, 0, 'Business', '');
    insert.run(3, 'Mort', 13, 'fr', 20, daysAgo(3), 9, 1, 'Business', '');
    insert.run(4, 'Sans Apple', 0, 'fr', 20, daysAgo(3), 9, 0, 'Business', '');
    insert.run(5, 'Endormi', 15, 'fr', 20, daysAgo(120), 9, 0, 'Business', '');
    insert.run(6, 'En allemand', 16, 'de', 20, daysAgo(3), 9, 0, 'Business', '');
    insert.run(7, 'Humour', 17, 'fr', 20, daysAgo(3), 1, 0, 'Comedy', '');
    insert.run(9, 'Sans catégorie connue', 19, 'en', 20, daysAgo(3), 0, 0, 'Pets', '');
    insert.run(8, 'Trop jeune', 18, 'fr', 1, daysAgo(3), 9, 0, 'Education', '');
    const query = candidateQuery(NOW, 10);
    const rows = db.prepare(query.sql).all(...query.params) as Record<string, unknown>[];
    expect(rows.map(row => row.title)).toEqual(['Bon, populaire', 'Bon', 'Humour', 'Sans catégorie connue']);
    expect(rows.map(categoryOf)).toEqual(['Arts', 'Business', 'Humour', 'Pets']);
  });
});

const feed = `<?xml version="1.0"?><rss><channel><title>Le podcast</title>
  <item><title><![CDATA[Épisode récent]]></title><link>https://exemple.fr/ep2</link><pubDate>Mon, 02 Nov 2026 08:00:00 GMT</pubDate>
    <description><![CDATA[<p>Merci à NordVPN : code MERKOD pour -60 %</p>]]></description></item>
  <item><title>Vieil épisode</title><pubDate>Mon, 02 Jun 2025 08:00:00 GMT</pubDate><description>Notion, code VIEUX10</description></item>
</channel></rss>`;
const tools = [{ id: '00000000-0000-4000-8000-000000000001', name: 'NordVPN', domain: 'nordvpn.com' }, { id: '00000000-0000-4000-8000-000000000002', name: 'Notion', domain: 'notion.so' }];

describe('lecture d’un flux', () => {
  it('lit les épisodes d’un flux RSS', () => {
    const items = parseFeedItems(feed);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: 'Épisode récent', link: 'https://exemple.fr/ep2' });
    expect(items[0].text).toContain('code MERKOD');
    expect(items[0].publishedAt?.toISOString()).toBe('2026-11-02T08:00:00.000Z');
  });
  it('ne garde que les codes d’outils du catalogue des 90 derniers jours', () => {
    const hits = scanFeed(parseFeedItems(feed), tools, NOW);
    expect(hits).toEqual([expect.objectContaining({ toolId: tools[0].id, code: 'MERKOD', episodeTitle: 'Épisode récent', episodeUrl: 'https://exemple.fr/ep2' })]);
  });
});

describe('parseCandidates', () => {
  const ids = new Set(tools.map(tool => tool.id));
  const good = { itunesId: '123', podcastIndexId: 9, title: 'Podcast', author: 'Moi', feedUrl: 'https://feed.fr/rss', imageUrl: 'https://img.fr/a.jpg', language: 'FR-fr', category: 'Business', episodeCount: 12, newestEpisodeAt: '2026-11-01T00:00:00Z',
    hits: [{ toolId: tools[0].id, code: 'MERKOD', evidence: 'code MERKOD', episodeTitle: 'Ep', episodeUrl: 'javascript:alert(1)', publishedAt: 'pas une date' }] };
  it('garde une entrée valide et nettoie ses champs', () => {
    const [item] = parseCandidates([good], ids);
    expect(item).toMatchObject({ itunesId: '123', language: 'fr-fr', imageUrl: 'https://img.fr/a.jpg' });
    expect(item.hits[0]).toMatchObject({ episodeUrl: null, publishedAt: null });
  });
  it('écarte les entrées sans identifiant Apple, sans flux http ou sans outil connu', () => {
    expect(parseCandidates([{ ...good, itunesId: 'abc' }], ids)).toEqual([]);
    expect(parseCandidates([{ ...good, feedUrl: 'ftp://x' }], ids)).toEqual([]);
    expect(parseCandidates([{ ...good, hits: [{ ...good.hits[0], toolId: '00000000-0000-4000-8000-00000000000f' }] }], ids)).toEqual([]);
    expect(parseCandidates('pas une liste', ids)).toEqual([]);
  });
});
