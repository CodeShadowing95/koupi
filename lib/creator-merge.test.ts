import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { createTool } from './catalog-admin';
import { bestMatch, inviteTarget, LINK_INVITE_ACTION, listPagesToLink, mergeProvisionalPage, sendLinkInvite } from './creator-merge';
import { runSelfProof } from './creator-self-proof';

const now = new Date('2026-11-08T12:00:00Z');

describe('vraie page d’une page provisoire', () => {
  const page = (slug: string, name: string, handles: string[] = ['@x'], codes = 0) =>
    ({ slug, name, codes, accounts: handles.map(handle => ({ platform: 'youtube' as const, handle })) });
  it('trouve la page au nom proche, avec des comptes, jamais une autre page provisoire', () => {
    const pages = [page('nchang-belinga', 'Nchang Belinga', ['@nchang.belinga']), page('nchang', 'Nchang', []), page('nchang-b', 'Nchang B')];
    expect(bestMatch(pages, { slug: 'nchang-b', name: 'Nchang' }, new Set(['nchang-b']))?.slug).toBe('nchang-belinga');
    expect(bestMatch(pages, { slug: 'nb-officiel', name: 'Nchang Belinga officiel' }, new Set())?.slug).toBe('nchang-belinga');
    expect(bestMatch(pages, { slug: 'zed', name: 'Zed' }, new Set())).toBeNull();
  });
});

describe('fusion de la page provisoire', () => {
  let db: Db;
  let real: string;
  let temp: string;
  let toolId: string;
  let user: { id: string; email: string };

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'notes', name: 'Notes' });
    expect((await createTool(db, { name: 'Notion', categorySlug: 'notes', website: 'https://notion.so', description: null, priority: 1 })).ok).toBe(true);
    [{ id: toolId }] = await db.select({ id: schema.tools.id }).from(schema.tools);
    [{ id: real }, { id: temp }] = await db.insert(schema.creators).values([
      { slug: 'ana-tech', name: 'Ana Tech' },
      { slug: 'ana', name: 'Ana', bio: 'Je teste des applis.' },
    ]).returning();
    await db.insert(schema.creatorAccounts).values([
      { creatorId: real, platform: 'youtube', externalId: 'UCana', handle: '@anatech', url: 'https://youtube.com/@anatech', adminCheckedAt: now },
      { creatorId: temp, platform: 'instagram', handle: '@ana.insta', url: 'https://instagram.com/ana.insta' },
    ]);
    await db.insert(schema.codes).values({ toolId, creatorId: temp, code: 'ANA20', discount: '-20 %', sourceUrl: 'https://merkod.com/creators/ana', status: 'pending', origin: 'creator' });
    [user] = await db.insert(schema.creatorUsers).values({ email: 'ana@exemple.fr', creatorId: temp, accessGrantedAt: now }).returning();
  });

  it('déplace codes, comptes et bio, puis efface la page provisoire', async () => {
    expect(await mergeProvisionalPage(db, temp, real, now)).toEqual({ ok: true, data: { codes: 1 } });
    const [code] = await db.select().from(schema.codes);
    expect(code.creatorId).toBe(real);
    const accounts = await db.select().from(schema.creatorAccounts);
    expect(accounts.map(account => account.handle).sort()).toEqual(['@ana.insta', '@anatech']);
    expect(accounts.every(account => account.creatorId === real)).toBe(true);
    const pages = await db.select().from(schema.creators);
    expect(pages).toEqual([expect.objectContaining({ slug: 'ana-tech', bio: 'Je teste des applis.' })]);
    const [linked] = await db.select().from(schema.creatorUsers);
    expect(linked.creatorId).toBe(real);
  });

  it('ne fusionne jamais une page vérifiée', async () => {
    await db.update(schema.creatorAccounts).set({ claimStatus: 'verified' }).where(eq(schema.creatorAccounts.creatorId, temp));
    expect(await mergeProvisionalPage(db, temp, real, now)).toMatchObject({ ok: false });
    expect(await db.select().from(schema.creators)).toHaveLength(2);
  });

  it('fusionne quand il prouve la vraie page par sa bio', async () => {
    const [account] = await db.select().from(schema.creatorAccounts).where(eq(schema.creatorAccounts.creatorId, real));
    await db.insert(schema.creatorRequests).values({ creatorId: real, kind: 'claim', email: user.email, accountUrl: 'https://youtube.com/@anatech', ipHash: 'x' });
    const deps = (description: string) => ({ readDescription: async () => description, now, newCode: () => 'MERKOD-AAAAAA' });
    await runSelfProof(db, user, account.id, 'start', deps(''));
    expect(await runSelfProof(db, user, account.id, 'check', deps('merkod-aaaaaa'))).toMatchObject({ ok: true, data: { state: 'proven' } });
    expect((await db.select().from(schema.creators)).map(page => page.slug)).toEqual(['ana-tech']);
    const [code] = await db.select().from(schema.codes);
    expect(code.creatorId).toBe(real);
  });

  it('liste la page à relier et retient l’invitation envoyée', async () => {
    await db.update(schema.creators).set({ name: 'Ana Tech officiel' }).where(eq(schema.creators.id, temp));
    const [first] = await listPagesToLink(db);
    expect(first).toMatchObject({ email: 'ana@exemple.fr', page: { slug: 'ana' }, match: { slug: 'ana-tech' }, invitedAt: null });
    await db.insert(schema.adminAuditLog).values({ action: LINK_INVITE_ACTION, target: inviteTarget('ana@exemple.fr', 'ana-tech') });
    expect((await listPagesToLink(db))[0].invitedAt).not.toBeNull();
    // Une fois une chaîne prouvée, la page n'est plus provisoire : plus rien à relier.
    await db.update(schema.creatorAccounts).set({ claimStatus: 'verified' }).where(eq(schema.creatorAccounts.handle, '@ana.insta'));
    expect(await listPagesToLink(db)).toEqual([]);
  });
});

describe('invitation à relier sa page', () => {
  it('écrit au créateur, le note au journal, et refuse s’il n’y a plus rien à relier', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    const [real, temp] = await db.insert(schema.creators).values([{ slug: 'ana-tech', name: 'Ana Tech' }, { slug: 'ana-tech-off', name: 'Ana Tech officiel' }]).returning();
    await db.insert(schema.creatorAccounts).values({ creatorId: real.id, platform: 'youtube', handle: '@anatech', url: 'https://youtube.com/@anatech' });
    const [user] = await db.insert(schema.creatorUsers).values({ email: 'ana@exemple.fr', creatorId: temp.id }).returning();
    const sent: { to: string; subject: string; text: string }[] = [];
    const mailer = async (mail: { to: string; subject: string; text: string }) => { sent.push(mail); };
    expect(await sendLinkInvite(db, user.id, mailer, 'https://merkod.com/creator', now)).toEqual({ ok: true, data: { invitedAt: now.toISOString() } });
    expect(sent[0]).toMatchObject({ to: 'ana@exemple.fr', subject: expect.stringContaining('Ana Tech') });
    expect(sent[0].text).toContain('https://merkod.com/creator#relier');
    const [log] = await db.select().from(schema.adminAuditLog);
    expect(log).toMatchObject({ action: LINK_INVITE_ACTION, target: 'ana@exemple.fr · ana-tech' });
    expect(await sendLinkInvite(db, '00000000-0000-0000-0000-000000000000', mailer, 'https://merkod.com/creator', now)).toMatchObject({ ok: false });
  });
});
