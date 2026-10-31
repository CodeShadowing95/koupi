import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { consumeRateLimit } from './rate-limit';

let db: Db;
beforeAll(async () => {
  const pglite = drizzle(new PGlite(), { schema });
  await migrate(pglite, { migrationsFolder: 'db/migrations' });
  db = pglite as unknown as Db;
});

const rule = { limit: 3, windowSeconds: 60 };

describe('limite d’essais', () => {
  it('laisse passer jusqu’à la limite puis bloque', async () => {
    const now = new Date('2026-10-31T12:00:00Z');
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consumeRateLimit(db, 'login:ip1', rule, now));
    expect(results.map(r => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3].retryAfterSeconds).toBe(60);
  });

  it('compte chaque clé séparément', async () => {
    const now = new Date('2026-10-31T12:00:00Z');
    expect((await consumeRateLimit(db, 'login:ip2', rule, now)).allowed).toBe(true);
    expect((await consumeRateLimit(db, 'submit:ip1', rule, now)).allowed).toBe(true);
  });

  it('repart à zéro quand la fenêtre est passée', async () => {
    const later = new Date('2026-10-31T12:01:01Z');
    const result = await consumeRateLimit(db, 'login:ip1', rule, later);
    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it('indique le temps restant avant de réessayer', async () => {
    const start = new Date('2026-10-31T13:00:00Z');
    for (let i = 0; i < 3; i++) await consumeRateLimit(db, 'login:ip3', rule, start);
    const blocked = await consumeRateLimit(db, 'login:ip3', rule, new Date('2026-10-31T13:00:45Z'));
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 15 });
  });
});
