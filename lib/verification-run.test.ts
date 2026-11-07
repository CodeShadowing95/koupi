import type Anthropic from '@anthropic-ai/sdk';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { aiConfigFrom } from './ai-extract';
import { createCode } from './codes-admin';
import { runVerification, youtubeReader, youtubeVideoId, type SourceReader } from './verification-run';

const URL_OK = 'https://www.youtube.com/watch?v=abc123XYZ';

async function setup() {
  const db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
  await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
  const created = await createCode(db, {
    toolSlug: 'nordvpn', creatorName: 'Ana', code: 'ANA10', discount: '-10 %', sourceUrl: URL_OK,
    sourceTitle: '', creatorLink: null, note: null, status: 'pending',
  });
  if (!created.ok) throw new Error('setup');
  return { db, codeId: created.data.id };
}

const reader = (description: string, online = true): SourceReader => async () => ({ online, title: 'Vidéo', description });

function aiResponse(model: string, codes: string[], expires = ''): Anthropic.Beta.BetaMessage {
  return {
    id: 'msg', type: 'message', role: 'assistant', model, stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify({ codes: codes.map(code => ({ code, tool: 'NordVPN', discount: '', conditions: '', expires_on: expires })) }) }],
    usage: { input_tokens: 1000, output_tokens: 200 },
  } as unknown as Anthropic.Beta.BetaMessage;
}

describe('youtubeVideoId', () => {
  it('lit les formes courantes d’adresse YouTube', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=abc123XYZ')).toBe('abc123XYZ');
    expect(youtubeVideoId('https://youtu.be/abc123XYZ?t=10')).toBe('abc123XYZ');
    expect(youtubeVideoId('https://youtube.com/shorts/abc123XYZ')).toBe('abc123XYZ');
    expect(youtubeVideoId('https://example.com/watch?v=abc123XYZ')).toBeNull();
    expect(youtubeVideoId('nope')).toBeNull();
  });
});

describe('youtubeReader', () => {
  it('ne lit rien sans clé', async () => {
    const fetchFn = vi.fn();
    expect(await youtubeReader(undefined, fetchFn as unknown as typeof fetch)(URL_OK)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('rend la description, ou une source disparue', async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify({ items: [{ snippet: { title: 'T', description: 'code ANA10' } }] })));
    expect(await youtubeReader('k', ok as unknown as typeof fetch)(URL_OK)).toEqual({ online: true, title: 'T', description: 'code ANA10' });
    const gone = vi.fn(async () => new Response(JSON.stringify({ items: [] })));
    expect(await youtubeReader('k', gone as unknown as typeof fetch)(URL_OK)).toEqual({ online: false, title: '', description: '' });
  });
});

describe('runVerification', () => {
  let ctx: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => { ctx = await setup(); });

  it('rend null pour un code inconnu', async () => {
    expect(await runVerification(ctx.db, '00000000-0000-0000-0000-000000000000', { readSource: reader('') })).toBeNull();
  });

  it('tient compte du niveau du créateur', async () => {
    const before = await runVerification(ctx.db, ctx.codeId, { readSource: reader('pas de code ici') });
    expect(before?.reasons.map(r => r.label)).toContain('Créateur repéré, pas encore contrôlé.');
    const [code] = await ctx.db.select().from(schema.codes).where(eq(schema.codes.id, ctx.codeId));
    await ctx.db.insert(schema.creatorAccounts).values({
      creatorId: code.creatorId, platform: 'youtube', externalId: 'UC1', handle: '@ana', url: 'https://youtube.com/@ana', platformVerified: true,
    });
    const after = await runVerification(ctx.db, ctx.codeId, { readSource: reader('pas de code ici') });
    expect(after?.reasons.map(r => r.label)).toContain('Créateur contrôlé par Merkod.');
    expect(after!.score).toBe(before!.score + 15);
  });

  it('prouve un code présent dans une source en ligne, sans IA', async () => {
    const check = await runVerification(ctx.db, ctx.codeId, { readSource: reader('Merci NordVPN, code ANA10 pour 10 %') });
    expect(check?.score).toBe(90);
    expect(check?.evidence).toContain('ANA10');
    expect(check).toMatchObject({ model: null, costUsdMicros: 0, extracted: null });
  });

  it('baisse le score quand la source a disparu', async () => {
    const check = await runVerification(ctx.db, ctx.codeId, { readSource: reader('', false) });
    expect(check?.score).toBeLessThan(20);
  });

  it('dit quand la source ne peut pas être lue', async () => {
    const check = await runVerification(ctx.db, ctx.codeId, { readSource: async () => null });
    expect(check?.reasons.map(r => r.label)).toContain('Cette source ne peut pas encore être lue automatiquement : ouvre-la toi-même.');
  });

  it('signale l’IA en attente sans clé', async () => {
    const check = await runVerification(ctx.db, ctx.codeId, { readSource: reader('code ANA10'), ai: { config: aiConfigFrom({}), create: null } });
    expect(check?.reasons.map(r => r.label)).toContain('IA en attente d’activation : pas de lecture par l’IA.');
  });

  it('lit avec Haiku seulement quand le dossier est clair', async () => {
    const create = vi.fn(async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => aiResponse(params.model, ['ANA10']));
    const config = aiConfigFrom({ ANTHROPIC_API_KEY: 'k' });
    const check = await runVerification(ctx.db, ctx.codeId, { readSource: reader('Merci NordVPN, code ANA10'), ai: { config, create } });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].model).toBe('claude-haiku-5-5');
    expect(check).toMatchObject({ model: 'claude-haiku-5-5', costUsdMicros: 200 });
  });

  it('fait relire par Opus quand Haiku ne trouve rien dans une description promo', async () => {
    const create = vi.fn(async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => aiResponse(params.model, []));
    const config = aiConfigFrom({ ANTHROPIC_API_KEY: 'k' });
    const check = await runVerification(ctx.db, ctx.codeId, { readSource: reader('Profitez de -10 % chez NordVPN'), ai: { config, create } });
    expect(create.mock.calls.map(call => call[0].model)).toEqual(['claude-haiku-5-5', 'claude-opus-5-5']);
    expect(check).toMatchObject({ model: 'claude-opus-5-5', costUsdMicros: 8200 });
  });

  it('retire des points quand l’IA ne retrouve pas le code', async () => {
    const config = aiConfigFrom({ ANTHROPIC_API_KEY: 'k' });
    const seen = vi.fn(async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => aiResponse(params.model, ['ANA10']));
    const clear = await runVerification(ctx.db, ctx.codeId, { readSource: reader('Merci NordVPN, code ANA10'), ai: { config, create: seen } });
    const missed = vi.fn(async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => aiResponse(params.model, []));
    const doubtful = await runVerification(ctx.db, ctx.codeId, { readSource: reader('Merci NordVPN, code ANA10'), ai: { config, create: missed } });
    expect(doubtful!.score).toBe(clear!.score - 20);
    expect(doubtful?.reasons).toContainEqual({ points: -20, label: 'L’IA ne retrouve pas ce code dans la description.' });
    const other = vi.fn(async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => aiResponse(params.model, ['CQ410']));
    const corrected = await runVerification(ctx.db, ctx.codeId, { readSource: reader('ANA10 · Code promo NordVPN : CQ410'), ai: { config, create: other } });
    expect(corrected?.reasons).toContainEqual({ points: -20, label: 'L’IA ne retrouve pas ce code dans la description. Elle y lit plutôt : CQ410.' });
  });

  it('relit directement avec Opus à la demande', async () => {
    const create = vi.fn(async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => aiResponse(params.model, ['ANA10']));
    const config = aiConfigFrom({ ANTHROPIC_API_KEY: 'k' });
    await runVerification(ctx.db, ctx.codeId, { readSource: reader('code ANA10'), ai: { config, create } }, 'review');
    expect(create.mock.calls.map(call => call[0].model)).toEqual(['claude-opus-5-5']);
  });

  it('n’appelle plus l’IA au-delà du plafond', async () => {
    const create = vi.fn(async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => aiResponse(params.model, ['ANA10']));
    const config = { ...aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), monthlyBudgetUsdMicros: 100 };
    await ctx.db.insert(schema.verificationChecks).values({ codeId: ctx.codeId, score: 50, costUsdMicros: 100 });
    const check = await runVerification(ctx.db, ctx.codeId, { readSource: reader('code ANA10'), ai: { config, create } });
    expect(create).not.toHaveBeenCalled();
    expect(check?.reasons.map(r => r.label)).toContain('Plafond du mois atteint : pas de lecture par l’IA.');
  });

  it('pré-remplit la date de fin trouvée par l’IA, sans écraser celle de l’admin', async () => {
    const create = vi.fn(async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => aiResponse(params.model, ['ANA10'], '2026-12-31'));
    const config = aiConfigFrom({ ANTHROPIC_API_KEY: 'k' });
    const check = await runVerification(ctx.db, ctx.codeId, { readSource: reader('Code ANA10 jusqu’au 31/12'), ai: { config, create } });
    expect(check?.reasons.map(r => r.label)).toContain('L’IA a trouvé une date de fin (2026-12-31) et l’a ajoutée au code.');
    let [row] = await ctx.db.select().from(schema.codes).where(eq(schema.codes.id, ctx.codeId));
    expect(row.expiresOn).toBe('2026-12-31');
    await ctx.db.update(schema.codes).set({ expiresOn: '2027-01-15' }).where(eq(schema.codes.id, ctx.codeId));
    await runVerification(ctx.db, ctx.codeId, { readSource: reader('Code ANA10 jusqu’au 31/12'), ai: { config, create } });
    [row] = await ctx.db.select().from(schema.codes).where(eq(schema.codes.id, ctx.codeId));
    expect(row.expiresOn).toBe('2027-01-15');
  });

  it('repère un doublon', async () => {
    // L'admin refuse un deuxième ANA10 pour NordVPN ; un doublon peut encore venir d'une recherche automatique, écrit ici directement en base.
    const [tool] = await ctx.db.select({ id: schema.tools.id }).from(schema.tools).where(eq(schema.tools.slug, 'nordvpn'));
    await ctx.db.insert(schema.creators).values({ slug: 'bob', name: 'Bob' });
    const [bob] = await ctx.db.select({ id: schema.creators.id }).from(schema.creators).where(eq(schema.creators.slug, 'bob'));
    await ctx.db.insert(schema.codes).values({ toolId: tool.id, creatorId: bob.id, code: 'ana10', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=other1234', status: 'verified' });
    const check = await runVerification(ctx.db, ctx.codeId, { readSource: reader('code ANA10') });
    expect(check?.reasons.map(r => r.label)).toContain('Un code identique existe déjà.');
  });
});
