import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createTool } from './catalog-admin';
import { createCode } from './codes-admin';
import {
  consumeSignInToken, copiesByCode, createSignInLink, grantCreatorAccess, grantedAccessKeys, hashToken, loadCreatorAccount,
  newSignInToken, normalizeEmail, parseSignInRequest, pruneSignInTokens, revokeCreatorAccess,
} from './creator-auth';

const now = new Date('2026-11-03T12:00:00Z');
const minutes = (n: number) => new Date(now.getTime() + n * 60_000);
const TOKEN = 'T'.repeat(43);
const context = { ipHash: 'ip', appUrl: 'https://koupi.test', now, newToken: () => TOKEN };

describe('demande de lien', () => {
  it('normalise l’e-mail et vérifie la page', () => {
    expect(normalizeEmail('  Ana@Exemple.FR ')).toBe('ana@exemple.fr');
    expect(normalizeEmail('ana')).toBeNull();
    expect(parseSignInRequest({ email: 'Ana@exemple.fr', slug: 'ana-tech' })).toEqual({ ok: true, data: { email: 'ana@exemple.fr', slug: 'ana-tech' } });
    expect(parseSignInRequest({ email: 'ana@exemple.fr' })).toEqual({ ok: true, data: { email: 'ana@exemple.fr', slug: null } });
    expect(parseSignInRequest({ email: 'x' })).toEqual({ ok: false, error: expect.stringContaining('e-mail') });
    expect(parseSignInRequest({ email: 'ana@exemple.fr', slug: '../admin' })).toEqual({ ok: false, error: 'Créateur inconnu.' });
  });
  it('crée des jetons longs et différents', () => {
    const a = newSignInToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newSignInToken()).not.toBe(a);
    expect(hashToken(a)).toHaveLength(64);
  });
});

describe('connexion des créateurs', () => {
  let db: Db;
  let ana: string;

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    [{ id: ana }] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning();
    await db.insert(schema.creatorAccounts).values([
      { creatorId: ana, platform: 'tiktok', handle: '@ana.tt', url: 'https://tiktok.com/@ana.tt' },
      { creatorId: ana, platform: 'youtube', handle: '@ana', url: 'https://www.youtube.com/@ana' },
    ]);
  });

  it('donne un lien, garde seulement son empreinte et enregistre la revendication une fois', async () => {
    const result = await createSignInLink(db, { email: 'ana@exemple.fr', slug: 'ana' }, context);
    expect(result).toEqual({ ok: true, data: { link: `https://koupi.test/creator/sign-in?token=${TOKEN}`, creatorName: 'Ana' } });
    const [token] = await db.select().from(schema.creatorSignInTokens);
    expect(token).toMatchObject({ email: 'ana@exemple.fr', tokenHash: hashToken(TOKEN), creatorSlug: 'ana', expiresAt: minutes(20) });
    expect(JSON.stringify(token)).not.toContain(TOKEN);

    await createSignInLink(db, { email: 'ana@exemple.fr', slug: 'ana' }, { ...context, newToken: () => 'U'.repeat(43) });
    const requests = await db.select().from(schema.creatorRequests);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ kind: 'claim', email: 'ana@exemple.fr', accountUrl: 'https://www.youtube.com/@ana', status: 'new' });

    expect(await createSignInLink(db, { email: 'ana@exemple.fr', slug: 'inconnu' }, context)).toEqual({ ok: false, error: 'Créateur inconnu.' });
  });

  it('connecte une seule fois, avant 20 minutes, et crée le compte Koupi', async () => {
    await createSignInLink(db, { email: 'ana@exemple.fr', slug: 'ana' }, context);
    const first = await consumeSignInToken(db, TOKEN, minutes(5));
    expect(first).toMatchObject({ ok: true, data: { slug: 'ana' } });
    expect(await consumeSignInToken(db, TOKEN, minutes(6))).toEqual({ ok: false, error: expect.stringContaining('ne marche plus') });

    await createSignInLink(db, { email: 'ana@exemple.fr', slug: null }, { ...context, newToken: () => 'V'.repeat(43) });
    expect(await consumeSignInToken(db, 'V'.repeat(43), minutes(21))).toEqual({ ok: false, error: expect.stringContaining('ne marche plus') });
    expect(await consumeSignInToken(db, 'mauvais', minutes(1))).toEqual({ ok: false, error: expect.stringContaining('ne marche plus') });

    const account = await loadCreatorAccount(db, first.ok ? first.data.userId : '');
    expect(account).toEqual({ id: expect.any(String), email: 'ana@exemple.fr', creator: null, claims: [{ slug: 'ana', name: 'Ana' }] });
  });

  it('ne donne l’accès à la page que quand l’admin le décide, et peut le retirer', async () => {
    await createSignInLink(db, { email: 'ana@exemple.fr', slug: 'ana' }, context);
    const [request] = await db.select().from(schema.creatorRequests);
    const signedIn = await consumeSignInToken(db, TOKEN, now);
    const userId = signedIn.ok ? signedIn.data.userId : '';

    expect(await grantCreatorAccess(db, request.id, now)).toEqual({ ok: false, error: expect.stringContaining('prouver un de ses comptes') });
    await db.update(schema.creatorAccounts).set({ claimStatus: 'verified', claimMethod: 'bio_code', claimedAt: now }).where(eq(schema.creatorAccounts.platform, 'youtube'));
    expect(await grantCreatorAccess(db, request.id, now)).toEqual({ ok: true, data: { userId } });
    expect((await db.select().from(schema.creatorRequests))[0].status).toBe('done');
    expect((await loadCreatorAccount(db, userId))?.creator).toEqual({ id: ana, slug: 'ana', name: 'Ana' });
    expect((await loadCreatorAccount(db, userId))?.claims).toEqual([]);
    expect(await grantedAccessKeys(db)).toEqual(new Set([`ana@exemple.fr|${ana}`]));

    expect(await revokeCreatorAccess(db, request.id)).toEqual({ ok: true, data: { revoked: 1 } });
    expect((await loadCreatorAccount(db, userId))?.creator).toBeNull();
  });

  it('refuse de donner l’accès depuis un signalement', async () => {
    const [report] = await db.insert(schema.creatorRequests).values({ creatorId: ana, kind: 'report', message: 'Erreur', ipHash: 'x' }).returning();
    expect(await grantCreatorAccess(db, report.id, now)).toEqual({ ok: false, error: expect.stringContaining('revendication') });
  });

  it('compte les copies du mois par code et efface les vieux liens', async () => {
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    await createTool(db, { name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com', description: null, priority: 1 });
    const code = await createCode(db, { toolSlug: 'nordvpn', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=1', sourceTitle: '', creatorLink: null, note: null, status: 'verified', creatorName: 'Ana', code: 'ANA10' });
    if (!code.ok) throw new Error('setup');
    await db.insert(schema.dailyCounters).values([
      { day: '2026-11-02', metric: 'copy', key: code.data.id, count: 7 },
      { day: '2026-10-30', metric: 'copy', key: code.data.id, count: 50 },
    ]);
    expect(await copiesByCode(db, ana, now)).toEqual(new Map([[code.data.id, 7]]));

    await createSignInLink(db, { email: 'ana@exemple.fr', slug: null }, context);
    await pruneSignInTokens(db, minutes(60 * 24 + 30));
    expect(await db.select().from(schema.creatorSignInTokens).where(eq(schema.creatorSignInTokens.email, 'ana@exemple.fr'))).toHaveLength(0);
  });
});
