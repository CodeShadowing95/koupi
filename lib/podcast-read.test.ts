import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiConfigFrom } from './ai-extract';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import type { PodcastDirectory, PodcastEpisode } from './apple-podcasts';
import { followPodcast, listPodcasts, setPodcastActive } from './podcasts-admin';
import { readPodcasts } from './podcast-read';
import { loadCatalog } from './catalog-db';

const now = new Date('2026-11-02T03:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
const episode = (id: number, description: string, published: Date | null = daysAgo(2), link = ''): PodcastEpisode => ({ id, title: `Épisode ${id}`, link, description, publishedAt: published });

function directory(episodes: Record<number, PodcastEpisode[]>): PodcastDirectory {
  return {
    search: vi.fn(),
    podcast: vi.fn(),
    podcasts: vi.fn(),
    episodes: vi.fn(async (id: number) => { if (!episodes[id]) throw new Error('503'); return episodes[id]; }),
  };
}

describe('readPodcasts', () => {
  let db: Db;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    await db.insert(schema.tools).values([{ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' }]);
    await followPodcast(db, { id: 42, title: 'Silicon Carne', author: '', feedUrl: '', link: '', image: '', episodeCount: 1, genre: '' });
  });

  it('ajoute en attente les codes des épisodes récents, crédités au créateur du podcast', async () => {
    const report = await readPodcasts(db, directory({ 42: [
      episode(1, 'Sponsor : NordVPN, -60 % avec le code CARNE', daysAgo(2), 'https://podcasts.apple.com/fr/podcast/silicon-carne/id42?i=1'),
      episode(2, 'NordVPN, code VIEUX', daysAgo(90)),
      episode(3, 'Pas de sponsor'),
    ] }), { now });
    expect(report).toEqual({ podcasts: 1, episodes: 2, found: [{ podcast: 'Silicon Carne', code: 'CARNE', tool: 'NordVPN' }], suggested: [], failed: [], aiRead: 0, remaining: 0 });
    const [code] = await db.select().from(schema.codes);
    const [podcast] = await listPodcasts(db);
    expect(code).toMatchObject({ code: 'CARNE', discount: '-60 %', status: 'pending', creatorId: podcast.creatorId, sourceTitle: 'Épisode 1', sourceUrl: 'https://podcasts.apple.com/fr/podcast/silicon-carne/id42?i=1' });
    expect(podcast.lastFetchedAt).toBe(now.toISOString());
    expect(await db.select().from(schema.codeLogs)).toHaveLength(1);
  });

  it('ne recrée pas un code déjà connu et donne un lien Apple à l’épisode sans lien', async () => {
    const dir = directory({ 42: [episode(5, 'NordVPN : code CARNE'), episode(6, 'NordVPN : code carne')] });
    await readPodcasts(db, dir, { now });
    await readPodcasts(db, dir, { now: new Date(now.getTime() + 86_400_000) });
    const rows = await db.select().from(schema.codes);
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceUrl).toBe('https://podcasts.apple.com/podcast/id42?i=5');
    // Sur le site, le code dit dans quel podcast il a été entendu.
    const [code] = (await loadCatalog(db)).codes;
    expect(code.podcast).toBe('Silicon Carne');
  });

  it('saute un podcast en pause, sauf lecture demandée pour lui', async () => {
    const [podcast] = await listPodcasts(db);
    await setPodcastActive(db, podcast.id, false);
    const dir = directory({ 42: [episode(1, 'NordVPN : code CARNE')] });
    expect((await readPodcasts(db, dir, { now })).podcasts).toBe(0);
    expect((await readPodcasts(db, dir, { now, onlyId: podcast.id })).found).toHaveLength(1);
  });

  it('continue quand un podcast ne répond pas, sans avancer sa date de lecture', async () => {
    await followPodcast(db, { id: 43, title: 'Autre', author: '', feedUrl: '', link: '', image: '', episodeCount: 1, genre: '' });
    const report = await readPodcasts(db, directory({ 43: [episode(1, 'NordVPN : code AUTRE')] }), { now });
    expect(report.failed).toEqual(['Silicon Carne']);
    expect(report.found).toHaveLength(1);
    const [silicon] = await db.select().from(schema.watchedSources).where(eq(schema.watchedSources.externalId, '42'));
    expect(silicon.lastFetchedAt).toBeNull();
  });

  it('garde en suggestion le code d’un outil absent du catalogue, une seule fois', async () => {
    const dir = directory({ 42: [episode(7, 'Gradium : la voix par IA, -10 % avec le code GDIY sur https://gradium.ai')] });
    const report = await readPodcasts(db, dir, { now });
    expect(report.found).toEqual([]);
    expect(report.suggested).toEqual([{ podcast: 'Silicon Carne', code: 'GDIY', tool: 'gradium.ai' }]);
    await readPodcasts(db, dir, { now: new Date(now.getTime() + 86_400_000) });
    const rows = await db.select().from(schema.toolSuggestions);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Gradium', domain: 'gradium.ai', code: 'GDIY', discount: '-10 %', status: 'open', sourceTitle: 'Épisode 7' });
    expect(await db.select().from(schema.codes)).toHaveLength(0);
  });

  it('s’arrête avant la limite de temps, lit d’abord les podcasts jamais lus et reprend où il en était', async () => {
    await followPodcast(db, { id: 43, title: 'Autre', author: '', feedUrl: '', link: '', image: '', episodeCount: 1, genre: '' });
    await followPodcast(db, { id: 44, title: 'Bavard', author: '', feedUrl: '', link: '', image: '', episodeCount: 1, genre: '' });
    // Silicon Carne a déjà été lu : il passe après les deux autres.
    await db.update(schema.watchedSources).set({ lastFetchedAt: daysAgo(1) }).where(eq(schema.watchedSources.externalId, '42'));
    const dir = directory({ 42: [], 43: [], 44: [] });
    let time = 0;
    const clock = () => (time += 1000);
    const first = await readPodcasts(db, dir, { now, budgetMs: 1500, clock });
    expect(first.podcasts).toBe(2);
    expect(first.remaining).toBe(1);
    expect(vi.mocked(dir.episodes).mock.calls.map(([id]) => id)).toEqual([43, 44]);
    const second = await readPodcasts(db, dir, { now: new Date(now.getTime() + 60_000), budgetMs: 1500, clock });
    expect(vi.mocked(dir.episodes).mock.calls.at(2)?.[0]).toBe(42);
    expect(second.podcasts).toBe(2);
  });

  it('prépare le dossier de vérification de chaque code trouvé', async () => {
    const readSource = vi.fn(async () => ({ online: true, title: 'Épisode 1', description: 'NordVPN : code CARNE' }));
    await readPodcasts(db, directory({ 42: [episode(1, 'NordVPN : code CARNE')] }), { now, deps: { readSource } });
    expect(readSource).toHaveBeenCalledWith('https://podcasts.apple.com/podcast/id42?i=1');
    const checks = await db.select().from(schema.verificationChecks);
    expect(checks).toHaveLength(1);
    expect(checks[0].evidence).toContain('CARNE');
  });

  describe('avec l’IA active', () => {
    const answer = (codes: unknown[]) => vi.fn(async () => ({ model: 'claude-haiku-5-5', stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 100 }, content: [{ type: 'text', text: JSON.stringify({ codes }) }] }));
    const deps = (create: unknown) => ({ readSource: vi.fn(async () => null), ai: { config: aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), create: create as never } });

    it('ajoute les codes lus par l’IA, avec réduction et date de fin, et compte son coût', async () => {
      const create = answer([
        { code: 'CARNE', tool: 'NordVPN', discount: '-60 % sur 2 ans', conditions: '', expires_on: '2026-12-31' },
        { code: 'GDIY', tool: 'Gradium', discount: '-10 %', conditions: '', expires_on: '' },
      ]);
      const report = await readPodcasts(db, directory({ 42: [
        episode(1, 'Merci à NordVPN : le code est CARNE pour une offre spéciale. Et Gradium aussi, code GDIY.'),
        episode(2, 'Une discussion sur la musique'),
      ] }), { now, deps: deps(create) });
      expect(create).toHaveBeenCalledTimes(1);
      expect(report.aiRead).toBe(1);
      expect(report.found).toEqual([{ podcast: 'Silicon Carne', code: 'CARNE', tool: 'NordVPN' }]);
      expect(report.suggested).toEqual([{ podcast: 'Silicon Carne', code: 'GDIY', tool: 'Gradium' }]);
      const [code] = await db.select().from(schema.codes);
      expect(code).toMatchObject({ discount: '-60 % sur 2 ans', expiresOn: '2026-12-31' });
      const usage = await db.select().from(schema.aiUsage);
      expect(usage).toMatchObject([{ purpose: 'podcast_notes', costUsdMicros: 150, ref: 'https://podcasts.apple.com/podcast/id42?i=1' }]);
    });

    it('ne relit pas par l’IA un épisode déjà lu, ni au-delà du plafond', async () => {
      const create = answer([]);
      const dir = directory({ 42: [episode(1, 'NordVPN, code CARNE')] });
      await readPodcasts(db, dir, { now, deps: deps(create) });
      await readPodcasts(db, dir, { now: new Date(now.getTime() + 86_400_000), deps: deps(create) });
      expect(create).toHaveBeenCalledTimes(1);
      const capped = { readSource: vi.fn(async () => null), ai: { config: { ...aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), monthlyBudgetUsdMicros: 0 }, create: create as never } };
      await followPodcast(db, { id: 43, title: 'Autre', author: '', feedUrl: '', link: '', image: '', episodeCount: 1, genre: '' });
      const report = await readPodcasts(db, directory({ 42: [], 43: [episode(9, 'code OFFRE')] }), { now, deps: capped });
      expect(report.aiRead).toBe(0);
    });
  });
});
