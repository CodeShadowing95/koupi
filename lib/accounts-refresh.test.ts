import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { refreshAllAccounts } from './accounts-refresh';
import { accountsByCreator } from './creator-accounts';

describe('actualiser tous les comptes', () => {
  let db: Db;
  let ana: string;
  let bob: string;
  const now = new Date('2026-11-05T09:00:00Z');
  beforeEach(async () => {
    const pglite = drizzle(new PGlite(), { schema });
    await migrate(pglite, { migrationsFolder: 'db/migrations' });
    db = pglite as unknown as Db;
    const rows = await db.insert(schema.creators).values([{ slug: 'ana', name: 'Ana' }, { slug: 'bob', name: 'Bob' }]).returning();
    [ana, bob] = rows.map(row => row.id);
    await db.insert(schema.creatorAccounts).values([
      { creatorId: ana, platform: 'youtube', externalId: 'UC1', handle: '@ana', url: 'https://youtube.com/@ana', subscribers: 10 },
      { creatorId: bob, platform: 'podcast', externalId: '42', handle: 'Bob parle', url: 'https://podcasts.apple.com/fr/podcast/id42', metrics: { country: 'BE', localeManual: true } },
    ]);
  });

  it('relit les chaînes et les podcasts, sans écraser un pays corrigé à la main', async () => {
    const youtube = { channels: vi.fn(async () => new Map([['UC1', { id: 'UC1', handle: '@ana', url: '', subscribers: 1200, metrics: { views: 90_000, videos: 30, country: 'FR', language: 'fr' } }]])) };
    const podcast = vi.fn(async () => ({ episodes: 12, language: 'nl', country: 'NL' }));
    const report = await refreshAllAccounts(db, { youtube, podcast }, { now });
    expect(report).toEqual({ youtube: 1, podcasts: 1, podcastsLeft: 0, failed: [], youtubeReady: true });
    const [anaAccount] = (await accountsByCreator(db)).get(ana)!;
    expect(anaAccount).toMatchObject({ subscribers: 1200, metrics: { views: 90_000, videos: 30, country: 'FR', language: 'fr' } });
    const [bobAccount] = (await accountsByCreator(db)).get(bob)!;
    expect(bobAccount.metrics).toEqual({ episodes: 12, country: 'BE', localeManual: true });
  });

  it('sans clé YouTube, relit quand même les podcasts, par paquets', async () => {
    await db.insert(schema.creatorAccounts).values({ creatorId: bob, platform: 'podcast', externalId: '43', handle: 'Bob bis', url: 'https://podcasts.apple.com/fr/podcast/id43' });
    const podcast = vi.fn(async () => { throw new Error('503'); });
    const first = await refreshAllAccounts(db, { youtube: null, podcast }, { now, podcastLimit: 1 });
    expect(first).toMatchObject({ youtube: 0, podcasts: 0, podcastsLeft: 1, youtubeReady: false, failed: [{ creator: 'Bob', reason: expect.stringContaining('Apple') }] });
    // Le podcast en échec passe en fin de file : le suivant est relu au clic d'après.
    const ok = vi.fn(async () => ({ episodes: 3 }));
    await refreshAllAccounts(db, { youtube: null, podcast: ok }, { now: new Date('2026-11-05T10:00:00Z'), podcastLimit: 1 });
    expect(ok).toHaveBeenCalledWith({ externalId: '43', url: 'https://podcasts.apple.com/fr/podcast/id43' });
  });
});
