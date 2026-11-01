import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '@/db/schema';

// La route utilise getDb() : on la branche sur une base PGlite en mémoire.
const holder: { db?: unknown } = {};
vi.mock('@/db', () => ({ getDb: () => holder.db }));

beforeAll(async () => {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: 'db/migrations' });
  holder.db = db;
  process.env.ADMIN_PASSWORD = 'correct-password';
  process.env.SESSION_SECRET = 'test-session-secret';
});

const login = async (password: string, ip: string) => {
  const { POST } = await import('./route');
  return POST(new Request('http://localhost/api/admin/login', {
    method: 'POST', body: JSON.stringify({ password }), headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  }));
};

describe('POST /api/admin/login', () => {
  it('bloque une IP après 5 essais, même avec le bon mot de passe', async () => {
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await login('wrong', '203.0.113.1')).status);
    const sixth = await login('correct-password', '203.0.113.1');
    expect(statuses).toEqual([401, 401, 401, 401, 401]);
    expect(sixth.status).toBe(429);
    expect(Number(sixth.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('laisse une autre IP se connecter', async () => {
    const response = await login('correct-password', '203.0.113.2');
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('koupi_admin=');
  });
});
