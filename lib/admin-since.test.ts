import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { parseSince, sinceVisit } from './admin-since';

const now = new Date('2026-11-05T12:00:00Z');

describe('parseSince', () => {
  it('garde une date passée, borne à 60 jours, refuse le reste', () => {
    expect(parseSince('2026-11-04T08:00:00Z', now)).toEqual(new Date('2026-11-04T08:00:00Z'));
    expect(parseSince('2025-01-01T00:00:00Z', now)).toEqual(new Date('2026-09-06T12:00:00Z'));
    expect(parseSince('2026-11-06T00:00:00Z', now)).toBeNull();
    expect(parseSince('pas une date', now)).toBeNull();
    expect(parseSince(null, now)).toBeNull();
  });
});

describe('sinceVisit', () => {
  it('compte codes, propositions, copies et avis arrivés depuis la date', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    const [tool] = await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' }).returning();
    const [creator] = await db.insert(schema.creators).values({ slug: 'geek', name: 'Geek' }).returning();
    const base = { toolId: tool.id, creatorId: creator.id, discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=x', sourceTitle: '' };
    await db.insert(schema.codes).values([
      { ...base, code: 'AVANT', createdAt: new Date('2026-11-03T10:00:00Z') },
      { ...base, code: 'APRES', createdAt: new Date('2026-11-04T10:00:00Z') },
    ]);
    await db.insert(schema.dailyCounters).values([
      { day: '2026-11-03', metric: 'copy', key: 'a', count: 9 },
      { day: '2026-11-04', metric: 'copy', key: 'a', count: 2 },
      { day: '2026-11-05', metric: 'copy', key: 'b', count: 3 },
      { day: '2026-11-05', metric: 'open', key: 'b', count: 7 },
    ]);
    await db.insert(schema.feedback).values([
      { kind: 'idea', message: 'Bravo', ipHash: 'h', createdAt: new Date('2026-11-04T20:00:00Z') },
      { kind: 'problem', message: 'Ancien', ipHash: 'h', createdAt: new Date('2026-11-01T20:00:00Z') },
    ]);
    expect(await sinceVisit(db, new Date('2026-11-04T08:00:00Z'))).toEqual({ codes: 1, submissions: 0, copies: 5, feedback: 1 });
  });
});
