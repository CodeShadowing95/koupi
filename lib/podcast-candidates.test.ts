import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { catalogToolIds, listCandidates, saveCandidates, scriptCatalog, setCandidateStatus } from './podcast-candidates';
import type { CandidateInput } from './podcast-index';

async function setup() {
  const db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
  const [nord] = await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://www.nordvpn.com' }).returning();
  await db.insert(schema.watchedSources).values({ platform: 'podcast', externalId: '999', title: 'Déjà suivi' });
  return { db, nord };
}

const candidate = (itunesId: string, toolId: string, title = `Podcast ${itunesId}`): CandidateInput => ({
  itunesId, podcastIndexId: 1, title, author: 'Auteur', feedUrl: 'https://feed.fr/rss', imageUrl: null, language: 'fr', category: 'Business',
  episodeCount: 10, newestEpisodeAt: '2026-11-01T00:00:00.000Z', hits: [{ toolId, code: 'MERKOD', evidence: 'code MERKOD', episodeTitle: 'Ep', episodeUrl: null, publishedAt: null }],
});

describe('podcasts candidats', () => {
  it('donne au script le catalogue et les podcasts suivis', async () => {
    const { db, nord } = await setup();
    const catalog = await scriptCatalog(db);
    expect(catalog.tools).toEqual([{ id: nord.id, name: 'NordVPN', domain: 'nordvpn.com' }]);
    expect(catalog.followed).toEqual(['999']);
    expect([...await catalogToolIds(db)]).toEqual([nord.id]);
  });

  it('enregistre les candidats, ignore les suivis et garde l’état d’un candidat écarté', async () => {
    const { db, nord } = await setup();
    expect(await saveCandidates(db, [candidate('1', nord.id), candidate('999', nord.id)])).toEqual({ saved: 1, followed: 1 });
    const [first] = await listCandidates(db);
    expect(first).toMatchObject({ itunesId: '1', status: 'new', hits: [expect.objectContaining({ toolName: 'NordVPN', code: 'MERKOD' })] });
    expect(await setCandidateStatus(db, first.id, 'dismissed')).toBe(true);
    await saveCandidates(db, [candidate('1', nord.id, 'Nouveau titre')], new Date('2026-11-12T00:00:00Z'));
    const [again] = await listCandidates(db);
    expect(again).toMatchObject({ title: 'Nouveau titre', status: 'dismissed', lastSeenAt: '2026-11-12T00:00:00.000Z' });
  });

  it('cache un candidat dès qu’il est suivi', async () => {
    const { db, nord } = await setup();
    await saveCandidates(db, [candidate('2', nord.id)]);
    await db.insert(schema.watchedSources).values({ platform: 'podcast', externalId: '2', title: 'Suivi ensuite' });
    expect(await listCandidates(db)).toEqual([]);
  });
});
