import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { purgeStaleYoutubeData, retentionCutoff } from './youtube-retention';

const now = new Date('2026-11-10T12:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe('règle des 30 jours de YouTube', () => {
  let db: Db;
  let ana: string;
  let zoe: string;
  let pod: string;

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    [{ id: ana }, { id: zoe }, { id: pod }] = await db.insert(schema.creators).values([
      { slug: 'ana', name: 'Ana' }, { slug: 'zoe', name: 'Zoé' }, { slug: 'pod', name: 'Pod' },
    ]).returning();
    await db.insert(schema.creatorAccounts).values([
      { creatorId: ana, platform: 'youtube' as const, externalId: 'UCana', handle: '@ana', url: 'https://youtube.com/@ana', subscribers: 5000, subscribersAt: daysAgo(31), metrics: { views: 10 }, metricsAt: daysAgo(31) },
      { creatorId: zoe, platform: 'youtube' as const, externalId: 'UCzoe', handle: '@zoe', url: 'https://youtube.com/@zoe', subscribers: 9000, subscribersAt: daysAgo(3) },
      { creatorId: pod, platform: 'podcast' as const, externalId: '123', handle: 'Pod', url: 'https://podcasts.apple.com/x', metrics: { ratingCount: 60 }, metricsAt: daysAgo(90) },
    ]);
    const image = { mime: 'image/jpeg' as const, data: 'aGk=', bytes: 2 };
    await db.insert(schema.storedImages).values([
      { creatorId: ana, ...image, sourceUrl: 'https://yt3.ggpht.com/a.jpg', fetchedAt: daysAgo(40) },
      { creatorId: zoe, ...image, sourceUrl: 'https://yt3.ggpht.com/z.jpg', fetchedAt: daysAgo(5) },
      { creatorId: pod, ...image, sourceUrl: 'https://is1-ssl.mzstatic.com/p.jpg', fetchedAt: daysAgo(90) },
    ]);
  });

  it('place la limite 30 jours avant', () => {
    expect(retentionCutoff(now).toISOString()).toBe('2026-10-11T12:00:00.000Z');
  });

  it('efface les abonnés, mesures et photos YouTube de plus de 30 jours, garde le reste', async () => {
    expect(await purgeStaleYoutubeData(db, now)).toEqual({ accounts: 1, photos: 1 });
    const accounts = await db.select().from(schema.creatorAccounts);
    const byHandle = Object.fromEntries(accounts.map(account => [account.handle, account]));
    expect(byHandle['@ana']).toMatchObject({ subscribers: null, subscribersAt: null, metrics: {}, metricsAt: null });
    expect(byHandle['@zoe'].subscribers).toBe(9000);
    expect(byHandle.Pod.metrics).toEqual({ ratingCount: 60 });
    const photos = await db.select({ creatorId: schema.storedImages.creatorId }).from(schema.storedImages);
    expect(photos.map(photo => photo.creatorId).sort()).toEqual([zoe, pod].sort());
  });
});
