import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '@/db/schema';

const holder: { db?: unknown } = {};
vi.mock('@/db', () => ({ getDb: () => holder.db }));

beforeAll(async () => {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: 'db/migrations' });
  holder.db = db;
  process.env.HASH_SALT = 'test-salt';
});

const submit = async (code: string, ip: string, turnstileToken?: string) => {
  const { POST } = await import('./route');
  return POST(new Request('http://localhost/api/submissions', {
    method: 'POST',
    body: JSON.stringify({ toolName: 'NordVPN', creatorName: 'Test', code, discountLabel: '-10 %', sourceUrl: 'https://youtube.com/watch?v=x', turnstileToken }),
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

describe('POST /api/submissions avec Turnstile', () => {
  afterEach(() => { delete process.env.TURNSTILE_SECRET_KEY; vi.unstubAllGlobals(); });

  it('refuse une proposition sans jeton anti-robot valide', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false }))));
    expect((await submit('BOT', '198.51.100.8', 'faux-jeton')).status).toBe(400);
    expect((await submit('BOT', '198.51.100.8')).status).toBe(400);
  });

  it('accepte une proposition quand Cloudflare valide le jeton', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    vi.stubGlobal('fetch', fetcher);
    expect((await submit('HUMAIN', '198.51.100.9', 'bon-jeton')).status).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('ferme le formulaire en production si la clé secrète manque', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try { expect((await submit('X', '198.51.100.10', 'jeton')).status).toBe(503); } finally { vi.unstubAllEnvs(); }
  });
});
