import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { NextRequest } from 'next/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '@/db/schema';
import { CREATOR_COOKIE, readCreatorToken } from '@/lib/creator-session';

const holder: { db?: ReturnType<typeof drizzle<typeof schema>> } = {};
vi.mock('@/db', () => ({ getDb: () => holder.db }));

beforeAll(async () => {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' });
  holder.db = db;
  process.env.HASH_SALT = 'test-salt';
  process.env.SESSION_SECRET = 's'.repeat(40);
});
afterEach(() => { vi.restoreAllMocks(); });

const post = async (path: 'request' | 'verify', body: Record<string, unknown>, ip = '198.51.100.30') => {
  const { POST } = await import(`./${path}/route`);
  return POST(new Request(`http://localhost/api/creator-auth/${path}`, {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  })) as Promise<Response>;
};

describe('connexion des créateurs par lien', () => {
  it('envoie un lien (affiché en local), puis le lien connecte une seule fois', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const response = await post('request', { email: 'Ana@Exemple.fr', slug: 'ana' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, sent: true });
    const line = String(log.mock.calls[0][0]);
    const token = new URL(line.slice(line.indexOf('http'))).searchParams.get('token')!;
    expect(line).toContain('http://localhost/creator/sign-in?token=');

    const signedIn = await post('verify', { token });
    expect(signedIn.status).toBe(200);
    const cookie = signedIn.headers.get('set-cookie')!;
    expect(cookie).toContain(`${CREATOR_COOKIE}=`);
    expect(cookie.toLowerCase()).toContain('httponly');
    const value = decodeURIComponent(cookie.split(';')[0].split('=')[1]);
    const [user] = await holder.db!.select().from(schema.creatorUsers);
    expect(await readCreatorToken(value, process.env.SESSION_SECRET)).toBe(user.id);
    expect(user.email).toBe('ana@exemple.fr');
    expect((await post('verify', { token })).status).toBe(400);

    // L'icône de la barre du haut : connecté, sans e-mail renvoyé ; sans cookie ou cookie faux, personne.
    const { GET } = await import('./me/route');
    const me = (cookieValue?: string) => GET(new NextRequest('http://localhost/api/creator-auth/me', cookieValue ? { headers: { cookie: `${CREATOR_COOKIE}=${cookieValue}` } } : {}));
    const known = await me(encodeURIComponent(value));
    expect(await known.json()).toEqual({ signedIn: true, name: null });
    expect(known.headers.get('cache-control')).toContain('no-store');
    expect(await (await me()).json()).toEqual({ signedIn: false, name: null });
    expect(await (await me('faux.123.abc')).json()).toEqual({ signedIn: false, name: null });
  });

  it('refuse un e-mail invalide ou une page inconnue', async () => {
    expect((await post('request', { email: 'ana' }, '198.51.100.31')).status).toBe(400);
    expect((await post('request', { email: 'ana@exemple.fr', slug: 'personne' }, '198.51.100.31')).status).toBe(404);
  });

  it('limite à 3 liens par heure pour une même adresse', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await post('request', { email: 'bob@exemple.fr' }, `198.51.100.${40 + i}`)).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});
