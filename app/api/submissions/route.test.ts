import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '@/db/schema';

const holder: { db?: unknown } = {};
vi.mock('@/db', () => ({ getDb: () => holder.db }));

beforeAll(async () => {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: 'db/migrations' });
  holder.db = db;
  process.env.HASH_SALT = 'test-salt';
});

const submit = async (code: string, ip: string) => {
  const { POST } = await import('./route');
  return POST(new Request('http://localhost/api/submissions', {
    method: 'POST',
    body: JSON.stringify({ toolName: 'NordVPN', creatorName: 'Test', code, discountLabel: '-10 %', sourceUrl: 'https://youtube.com/watch?v=x' }),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  }));
};

describe('POST /api/submissions', () => {
  it('accepte 5 propositions par IP et par heure, puis répond 429', async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await submit(`CODE${i}`, '198.51.100.7')).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('n’enregistre pas la proposition refusée', async () => {
    const rows = await (holder.db as ReturnType<typeof drizzle>).select().from(schema.submissions);
    expect(rows).toHaveLength(5);
  });
});
