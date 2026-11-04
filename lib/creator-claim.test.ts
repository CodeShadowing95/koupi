import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { bioContainsCode, claimCodeExpired, newClaimCode, runClaimAction, youtubeDescriptionReader } from './creator-claim';
import { claimMessage } from './creator-accounts-display';
import { creatorLevelFor } from './creator-level';

const CHANNEL_ID = 'UC' + 'b'.repeat(22);
const now = new Date('2026-11-03T10:00:00Z');
const later = (days: number) => new Date(now.getTime() + days * 86_400_000);

describe('code de preuve', () => {
  it('a la forme MERKOD-XXXXXX sans caractères ambigus', () => {
    for (let i = 0; i < 50; i++) expect(newClaimCode()).toMatch(/^MERKOD-[A-HJKMNP-Z2-9]{6}$/);
    expect(newClaimCode(() => 0)).toBe('MERKOD-AAAAAA');
  });
  it('se retrouve dans une bio malgré les majuscules et les espaces', () => {
    expect(bioContainsCode('Tech et IA. merkod - ab3cd7 ✨', 'MERKOD-AB3CD7')).toBe(true);
    expect(bioContainsCode('Tech et IA. MERKOD-AB3CD8', 'MERKOD-AB3CD7')).toBe(false);
  });
  it('expire après 14 jours', () => {
    expect(claimCodeExpired(now, later(14))).toBe(false);
    expect(claimCodeExpired(now, later(15))).toBe(true);
  });
  it('donne un message prêt à envoyer', () => {
    const message = claimMessage('MERKOD-AB3CD7', 'youtube', '@ana');
    expect(message).toContain('MERKOD-AB3CD7');
    expect(message).toContain('YouTube @ana');
  });
});

describe('youtubeDescriptionReader', () => {
  it('ne lit rien sans clé', () => {
    expect(youtubeDescriptionReader(undefined)).toBeNull();
  });
  it('rend la description, ou null si la chaîne n’existe plus', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      expect(url).toContain(`id=${CHANNEL_ID}`);
      return new Response(JSON.stringify({ items: [{ snippet: { description: 'Bio MERKOD-AB3CD7' } }] }));
    });
    expect(await youtubeDescriptionReader('k', fetchFn as unknown as typeof fetch)!(CHANNEL_ID)).toBe('Bio MERKOD-AB3CD7');
    const none = vi.fn(async () => new Response(JSON.stringify({ items: [] })));
    expect(await youtubeDescriptionReader('k', none as unknown as typeof fetch)!(CHANNEL_ID)).toBeNull();
  });
});

describe('preuve par la bio', () => {
  let db: Db;
  let creatorId: string;
  let youtube: string;
  let tiktok: string;
  const code = () => 'MERKOD-AB3CD7';
  const bio = (text: string | null) => async () => text;

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    [{ id: creatorId }] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning();
    const accounts = await db.insert(schema.creatorAccounts).values([
      { creatorId, platform: 'youtube', externalId: CHANNEL_ID, handle: '@ana', url: 'https://www.youtube.com/@ana', adminCheckedAt: now },
      { creatorId, platform: 'tiktok', handle: '@ana.tt', url: 'https://tiktok.com/@ana.tt', adminCheckedAt: now },
    ]).returning();
    [youtube, tiktok] = accounts.map(account => account.id);
  });

  const row = async (id: string) => (await db.select().from(schema.creatorAccounts).where(eq(schema.creatorAccounts.id, id)))[0];

  it('donne un code puis vérifie la bio YouTube : le créateur devient vérifié', async () => {
    expect(await runClaimAction(db, youtube, 'start', { readDescription: null, now, newCode: code })).toEqual({ ok: true, data: { status: 'pending', code: 'MERKOD-AB3CD7' } });
    expect(await row(youtube)).toMatchObject({ claimStatus: 'pending', claimMethod: 'bio_code', claimCode: 'MERKOD-AB3CD7' });

    expect(await runClaimAction(db, youtube, 'check', { readDescription: bio('Pas encore'), now: later(1) })).toEqual({ ok: true, data: { status: 'pending', code: 'MERKOD-AB3CD7', found: false } });
    expect(await creatorLevelFor(db, creatorId)).toBe('spotted');

    expect(await runClaimAction(db, youtube, 'check', { readDescription: bio('Tech. MERKOD-AB3CD7'), now: later(2) })).toEqual({ ok: true, data: { status: 'verified', code: null, found: true } });
    expect(await row(youtube)).toMatchObject({ claimStatus: 'verified', claimCode: null, claimCodeAt: null, claimedAt: later(2) });
    expect(await creatorLevelFor(db, creatorId)).toBe('verified');
  });

  it('refuse un code expiré ou une chaîne disparue', async () => {
    await runClaimAction(db, youtube, 'start', { readDescription: null, now, newCode: code });
    expect(await runClaimAction(db, youtube, 'check', { readDescription: bio('MERKOD-AB3CD7'), now: later(15) })).toEqual({ ok: false, error: expect.stringContaining('nouveau code') });
    expect(await runClaimAction(db, youtube, 'check', { readDescription: bio(null), now: later(1) })).toEqual({ ok: false, error: 'Cette chaîne n’existe plus sur YouTube.' });
    expect(await runClaimAction(db, youtube, 'check', { readDescription: null, now: later(1) })).toEqual({ ok: false, error: expect.stringContaining('YOUTUBE_API_KEY') });
  });

  it('laisse l’admin confirmer à la main sur les autres réseaux', async () => {
    await runClaimAction(db, tiktok, 'start', { readDescription: null, now, newCode: code });
    expect(await runClaimAction(db, tiktok, 'check', { readDescription: bio('x'), now })).toEqual({ ok: false, error: expect.stringContaining('confirme') });
    expect((await runClaimAction(db, tiktok, 'confirm', { readDescription: null, now }))).toMatchObject({ ok: true, data: { status: 'verified' } });
    expect(await creatorLevelFor(db, creatorId)).toBe('verified');
  });

  it('annule, retire et refuse les étapes hors d’ordre', async () => {
    expect(await runClaimAction(db, youtube, 'confirm', { readDescription: null, now })).toEqual({ ok: false, error: 'Aucune preuve en cours sur ce compte.' });
    await runClaimAction(db, youtube, 'start', { readDescription: null, now, newCode: code });
    expect(await runClaimAction(db, youtube, 'cancel', { readDescription: null, now })).toEqual({ ok: true, data: { status: 'none', code: null } });
    expect(await row(youtube)).toMatchObject({ claimStatus: 'none', claimMethod: null, claimCode: null });

    await runClaimAction(db, youtube, 'start', { readDescription: null, now, newCode: code });
    await runClaimAction(db, youtube, 'confirm', { readDescription: null, now });
    expect(await runClaimAction(db, youtube, 'start', { readDescription: null, now })).toEqual({ ok: false, error: 'Ce compte est déjà prouvé par le créateur.' });
    expect(await runClaimAction(db, youtube, 'revoke', { readDescription: null, now })).toEqual({ ok: true, data: { status: 'revoked', code: null } });
    expect(await creatorLevelFor(db, creatorId)).toBe('spotted');
    expect(await runClaimAction(db, youtube, 'revoke', { readDescription: null, now })).toEqual({ ok: false, error: 'Ce compte n’est pas prouvé par le créateur.' });
    expect(await runClaimAction(db, '00000000-0000-0000-0000-000000000000', 'start', { readDescription: null, now })).toEqual({ ok: false, error: 'Compte introuvable.' });
  });

  it('refuse toute preuve sur un compte que l’admin n’a pas contrôlé', async () => {
    await db.update(schema.creatorAccounts).set({ adminCheckedAt: null }).where(eq(schema.creatorAccounts.id, tiktok));
    expect(await runClaimAction(db, tiktok, 'start', { readDescription: null, now, newCode: code })).toEqual({ ok: false, error: expect.stringContaining('Contrôle d’abord ce compte') });
    expect((await row(tiktok)).claimStatus).toBe('none');

    await runClaimAction(db, youtube, 'start', { readDescription: null, now, newCode: code });
    await db.update(schema.creatorAccounts).set({ adminCheckedAt: null }).where(eq(schema.creatorAccounts.id, youtube));
    expect(await runClaimAction(db, youtube, 'check', { readDescription: bio('MERKOD-AB3CD7'), now })).toEqual({ ok: false, error: expect.stringContaining('Contrôle d’abord ce compte') });
    expect(await runClaimAction(db, youtube, 'confirm', { readDescription: null, now })).toEqual({ ok: false, error: expect.stringContaining('Contrôle d’abord ce compte') });
    expect(await creatorLevelFor(db, creatorId)).toBe('spotted');
  });

  it('la base refuse un code mal formé ou sans preuve en cours', async () => {
    await expect(db.update(schema.creatorAccounts).set({ claimStatus: 'pending', claimCode: 'abc', claimCodeAt: now }).where(eq(schema.creatorAccounts.id, youtube))).rejects.toThrow();
    await expect(db.update(schema.creatorAccounts).set({ claimStatus: 'none', claimCode: 'MERKOD-AB3CD7', claimCodeAt: now }).where(eq(schema.creatorAccounts.id, youtube))).rejects.toThrow();
  });

  it('garde valables les codes KOUPI- donnés avant le changement de nom', async () => {
    await db.update(schema.creatorAccounts).set({ claimStatus: 'pending', claimMethod: 'bio_code', claimCode: 'KOUPI-AB3CD7', claimCodeAt: now }).where(eq(schema.creatorAccounts.id, youtube));
    expect(await runClaimAction(db, youtube, 'check', { readDescription: bio('Tech. koupi-ab3cd7'), now: later(1) })).toEqual({ ok: true, data: { status: 'verified', code: null, found: true } });
    await expect(db.update(schema.creatorAccounts).set({ claimStatus: 'pending', claimCode: 'COUPI-AB3CD7', claimCodeAt: now }).where(eq(schema.creatorAccounts.id, tiktok))).rejects.toThrow();
  });
});
