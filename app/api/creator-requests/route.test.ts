import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '@/db/schema';

const holder: { db?: ReturnType<typeof drizzle<typeof schema>> } = {};
vi.mock('@/db', () => ({ getDb: () => holder.db }));

beforeAll(async () => {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' });
  holder.db = db;
  process.env.HASH_SALT = 'test-salt';
});

const send = async (body: Record<string, unknown>, ip = '198.51.100.20') => {
  const { POST } = await import('./route');
  return POST(new Request('http://localhost/api/creator-requests', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  }));
};
const claim = { kind: 'claim', slug: 'ana', email: 'ana@exemple.fr', accountUrl: 'youtube.com/@ana', message: 'C’est ma chaîne.' };

describe('POST /api/creator-requests', () => {
  it('enregistre une revendication et un signalement, sans garder l’IP en clair', async () => {
    expect((await send(claim)).status).toBe(200);
    expect((await send({ kind: 'report', slug: 'ana', message: 'Le code NORD ne marche plus.' })).status).toBe(200);
    const rows = await holder.db!.select().from(schema.creatorRequests);
    expect(rows.map(row => [row.kind, row.status, row.accountUrl])).toEqual([['claim', 'new', 'https://youtube.com/@ana'], ['report', 'new', null]]);
    expect(rows.every(row => !row.ipHash.includes('198.51.100.20'))).toBe(true);
  });

  it('refuse une demande incomplète ou pour un créateur inconnu', async () => {
    expect((await send({ ...claim, email: '' }, '198.51.100.21')).status).toBe(400);
    expect((await send({ ...claim, accountUrl: '' }, '198.51.100.21')).status).toBe(400);
    expect((await send({ kind: 'report', slug: 'ana' }, '198.51.100.21')).status).toBe(400);
    expect((await send({ ...claim, kind: 'autre' }, '198.51.100.21')).status).toBe(400);
    expect((await send({ ...claim, slug: 'personne' }, '198.51.100.21')).status).toBe(404);
  });

  it('accepte 5 demandes par IP et par heure, puis répond 429', async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await send({ kind: 'report', slug: 'ana', message: `Erreur ${i}` }, '198.51.100.22')).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });
});

describe('POST /api/creator-requests avec Turnstile', () => {
  afterEach(() => { delete process.env.TURNSTILE_SECRET_KEY; vi.unstubAllGlobals(); });

  it('refuse une demande sans jeton anti-robot valide', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false }))));
    expect((await send({ ...claim, turnstileToken: 'faux' }, '198.51.100.23')).status).toBe(400);
  });
});
