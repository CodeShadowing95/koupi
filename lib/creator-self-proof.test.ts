import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { provenCreatorIds } from './creator-level';
import { listSubmittedCodes, loadSelfProof, proofState, reviewSubmittedCode, runSelfProof } from './creator-self-proof';

const now = new Date('2026-11-08T12:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
let n = 0;
const codes = () => `MERKOD-${String.fromCharCode(65 + (n++ % 26)).repeat(6)}`;

describe('état d’un compte', () => {
  const base = { claimStatus: 'none' as const, adminCheckedAt: now };
  it('suit la preuve, le contrôle de l’admin et l’âge du code', () => {
    expect(proofState({ ...base, claimStatus: 'verified' }, undefined, now)).toBe('proven');
    expect(proofState({ ...base, claimStatus: 'revoked' }, undefined, now)).toBe('locked');
    expect(proofState({ ...base, adminCheckedAt: null }, undefined, now)).toBe('unchecked');
    expect(proofState(base, undefined, now)).toBe('open');
    expect(proofState(base, { createdAt: now, submittedAt: null }, days(3))).toBe('open');
    expect(proofState(base, { createdAt: now, submittedAt: now }, days(3))).toBe('waiting');
    expect(proofState(base, { createdAt: now, submittedAt: null }, days(15))).toBe('expired');
  });
});

describe('preuve par la bio en libre-service', () => {
  let db: Db;
  let ana: string;
  let youtube: string;
  let tiktok: string;
  let unchecked: string;
  let user: { id: string; email: string };
  let thief: { id: string; email: string };

  beforeEach(async () => {
    n = 0;
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    [{ id: ana }] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning();
    const [bob] = await db.insert(schema.creators).values({ slug: 'bob', name: 'Bob' }).returning();
    // Petite chaîne (sous le seuil d'audience) : la preuve ouvre l'espace, pas la rosette.
    [{ id: youtube }, { id: tiktok }, { id: unchecked }] = await db.insert(schema.creatorAccounts).values([
      { creatorId: ana, platform: 'youtube', externalId: 'UCana', handle: '@ana', url: 'https://youtube.com/@ana', subscribers: 300, adminCheckedAt: now },
      { creatorId: ana, platform: 'tiktok', handle: '@ana.tt', url: 'https://tiktok.com/@ana.tt', adminCheckedAt: now },
      { creatorId: bob.id, platform: 'youtube', externalId: 'UCbob', handle: '@bob', url: 'https://youtube.com/@bob' },
    ]).returning();
    const users = await db.insert(schema.creatorUsers).values([{ email: 'ana@exemple.fr' }, { email: 'faux@exemple.fr' }]).returning();
    user = users[0];
    thief = users[1];
    await db.insert(schema.creatorRequests).values([
      { creatorId: ana, kind: 'claim', email: user.email, accountUrl: 'https://youtube.com/@ana', ipHash: 'x' },
      { creatorId: ana, kind: 'claim', email: thief.email, accountUrl: 'https://youtube.com/@ana', ipHash: 'x' },
      { creatorId: bob.id, kind: 'claim', email: user.email, accountUrl: 'https://youtube.com/@bob', ipHash: 'x' },
    ]);
  });

  const deps = (description: string | null) => ({ readDescription: async () => description, now, newCode: codes });

  it('donne un code par personne : l’usurpateur n’écrase pas celui du vrai créateur', async () => {
    const mine = await runSelfProof(db, user, youtube, 'start', deps(''));
    const theirs = await runSelfProof(db, thief, youtube, 'start', deps(''));
    expect(mine).toEqual({ ok: true, data: { state: 'open', code: 'MERKOD-AAAAAA' } });
    expect(theirs).toEqual({ ok: true, data: { state: 'open', code: 'MERKOD-BBBBBB' } });
    // Redemander rend le même code.
    expect(await runSelfProof(db, user, youtube, 'start', deps(''))).toEqual(mine);

    expect(await runSelfProof(db, user, youtube, 'check', deps('Ma chaîne tech'))).toEqual({ ok: true, data: { state: 'open', code: 'MERKOD-AAAAAA', found: false } });
    // Le code de l'usurpateur dans la bio ne prouve rien pour le vrai créateur, et inversement.
    expect(await runSelfProof(db, thief, youtube, 'check', deps('merkod - aaaaaa'))).toMatchObject({ ok: true, data: { found: false } });
    expect(await runSelfProof(db, user, youtube, 'check', deps('Bio… merkod - aaaaaa'))).toEqual({ ok: true, data: { state: 'proven', code: null, found: true } });

    const [account] = await db.select().from(schema.creatorAccounts).where(eq(schema.creatorAccounts.id, youtube));
    expect(account).toMatchObject({ claimStatus: 'verified', claimMethod: 'bio_code' });
    expect(await db.select().from(schema.creatorClaimCodes).where(eq(schema.creatorClaimCodes.accountId, youtube))).toEqual([]);
    const [signedIn] = await db.select().from(schema.creatorUsers).where(eq(schema.creatorUsers.id, user.id));
    expect(signedIn.creatorId).toBe(ana);
    const requests = await db.select().from(schema.creatorRequests).where(eq(schema.creatorRequests.email, user.email));
    expect(requests.find(r => r.creatorId === ana)?.status).toBe('done');
    expect(requests.find(r => r.creatorId !== ana)?.status).toBe('new');
    // Sous le seuil d'audience : pas de rosette.
    expect(await provenCreatorIds(db)).toEqual(new Set());

    expect(await runSelfProof(db, thief, youtube, 'start', deps(''))).toEqual({ ok: false, error: expect.stringContaining('déjà prouvé') });
  });

  it('refuse un compte non contrôlé, une page non revendiquée, et un code expiré', async () => {
    expect(await runSelfProof(db, user, unchecked, 'start', deps(''))).toEqual({ ok: false, error: expect.stringContaining('contrôle d’abord') });
    const stranger = (await db.insert(schema.creatorUsers).values({ email: 'x@exemple.fr' }).returning())[0];
    expect(await runSelfProof(db, stranger, youtube, 'start', deps(''))).toEqual({ ok: false, error: expect.stringContaining('Revendique') });
    expect(await runSelfProof(db, user, youtube, 'check', deps(''))).toEqual({ ok: false, error: expect.stringContaining('Demande d’abord') });
    await runSelfProof(db, user, youtube, 'start', deps(''));
    const later = { ...deps('MERKOD-AAAAAA'), now: days(15) };
    expect(await runSelfProof(db, user, youtube, 'check', later)).toEqual({ ok: false, error: expect.stringContaining('Demande d’abord') });
    expect(await runSelfProof(db, user, youtube, 'start', later)).toEqual({ ok: true, data: { state: 'open', code: 'MERKOD-BBBBBB' } });
    expect(await runSelfProof(db, user, youtube, 'check', { ...deps(''), readDescription: null })).toEqual({ ok: false, error: expect.stringContaining('indisponible') });
  });

  it('autres réseaux : le créateur dit « c’est fait », l’admin constate', async () => {
    await runSelfProof(db, user, tiktok, 'start', deps(''));
    expect(await runSelfProof(db, user, tiktok, 'check', deps(''))).toEqual({ ok: false, error: expect.stringContaining('C’est fait') });
    expect(await runSelfProof(db, user, tiktok, 'submit', deps(''))).toEqual({ ok: true, data: { state: 'waiting', code: 'MERKOD-AAAAAA' } });
    expect(await runSelfProof(db, user, youtube, 'submit', deps(''))).toEqual({ ok: false, error: expect.stringContaining('Demande d’abord') });

    const [submitted] = await listSubmittedCodes(db);
    expect(submitted).toMatchObject({ code: 'MERKOD-AAAAAA', email: 'ana@exemple.fr', account: { label: 'TikTok', handle: '@ana.tt' }, creator: { slug: 'ana' } });
    // Pas trouvé : le créateur peut réessayer.
    expect(await reviewSubmittedCode(db, submitted.id, false, now)).toEqual({ ok: true, data: { proven: false } });
    expect(await listSubmittedCodes(db)).toEqual([]);
    await runSelfProof(db, user, tiktok, 'submit', deps(''));
    expect(await reviewSubmittedCode(db, submitted.id, true, now)).toEqual({ ok: true, data: { proven: true } });
    expect((await db.select().from(schema.creatorUsers).where(eq(schema.creatorUsers.id, user.id)))[0].creatorId).toBe(ana);
    expect(await reviewSubmittedCode(db, submitted.id, true, now)).toEqual({ ok: false, error: expect.stringContaining('introuvable') });
  });

  it('montre au créateur ses pages, leurs comptes et son code', async () => {
    await runSelfProof(db, user, youtube, 'start', deps(''));
    const pages = await loadSelfProof(db, user, now);
    expect(pages.map(page => page.slug)).toEqual(['ana', 'bob']);
    expect(pages[0].accounts).toEqual([
      expect.objectContaining({ id: youtube, label: 'YouTube', readable: true, state: 'open', code: 'MERKOD-AAAAAA' }),
      expect.objectContaining({ id: tiktok, label: 'TikTok', readable: false, state: 'open', code: null }),
    ]);
    expect(pages[1].accounts).toEqual([expect.objectContaining({ id: unchecked, state: 'unchecked', code: null })]);
    expect(await loadSelfProof(db, thief, now)).toEqual([expect.objectContaining({ slug: 'ana' })]);
  });
});
