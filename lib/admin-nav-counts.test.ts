import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { applyCodeAction, createCode, type CodeInput } from './codes-admin';
import { navWaitingCounts } from './admin-nav-counts';

const base: CodeInput = {
  toolSlug: 'nordvpn', creatorName: 'Ana', code: 'ANA10', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=a',
  sourceTitle: '', creatorLink: null, note: null, status: 'pending',
};

describe('navWaitingCounts', () => {
  it('compte les codes en attente (hors archives), les outils à ajouter ouverts et les nouveaux candidats', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    expect(await navWaitingCounts(db)).toEqual({ toDecide: 0, toolsToAdd: 0, newCandidates: 0 });

    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
    const ids = [];
    for (const code of ['A1', 'A2', 'A3']) {
      const created = await createCode(db, { ...base, code });
      if (!created.ok) throw new Error(created.error);
      ids.push(created.data.id);
    }
    await createCode(db, { ...base, code: 'T1', status: 'to_test' });
    await applyCodeAction(db, ids[0], 'archive');
    await applyCodeAction(db, ids[1], 'verify');
    await db.insert(schema.toolSuggestions).values([
      { name: 'Aferiy', domain: 'aferiy.com', code: 'X1', discount: 'Voir la vidéo', evidence: 'e', sourceUrl: 'https://youtube.com/watch?v=a', sourceTitle: 'v' },
      { name: 'Engwe', domain: 'engwe.com', code: 'X2', discount: 'Voir la vidéo', evidence: 'e', sourceUrl: 'https://youtube.com/watch?v=a', sourceTitle: 'v', status: 'ignored' },
    ]);
    expect(await navWaitingCounts(db)).toMatchObject({ toDecide: 1, toolsToAdd: 1 });
  });

  it('ne compte pas un candidat déjà suivi, ni un candidat écarté', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.podcastCandidates).values([
      { itunesId: '111', title: 'Suivi depuis', feedUrl: 'https://a.example/feed' },
      { itunesId: '222', title: 'À examiner', feedUrl: 'https://b.example/feed' },
      { itunesId: '333', title: 'Écarté', feedUrl: 'https://c.example/feed', status: 'dismissed' },
    ]);
    expect((await navWaitingCounts(db)).newCandidates).toBe(2);
    await db.insert(schema.watchedSources).values({ platform: 'podcast', externalId: '111', title: 'Suivi depuis' });
    expect((await navWaitingCounts(db)).newCandidates).toBe(1);
  });
});
