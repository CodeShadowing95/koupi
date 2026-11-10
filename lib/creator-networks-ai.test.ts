import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { aiConfigFrom } from './ai-extract';
import { createCode } from './codes-admin';
import { cleanProposals, findCreatorNetworks, networksPrompt, responseCost, SEARCH_USD_MICROS } from './creator-networks-ai';

const CHANNEL_ID = 'UC' + 'b'.repeat(22);
const insta = { platform: 'instagram', handle: 'ana.tech', url: 'https://www.instagram.com/ana.tech/', followers: 12400, reason: 'Lien dans la description YouTube.', source: 'https://www.youtube.com/@ana', confidence: 'sure' };

describe('cleanProposals', () => {
  it('garde un profil sur le bon réseau et relit le pseudo dans le lien', () => {
    expect(cleanProposals({ accounts: [insta] }, [])).toEqual([{ ...insta, handle: '@ana.tech' }]);
  });

  it('écarte un lien sur un autre réseau, un post, un lien http ou une adresse inventée', () => {
    expect(cleanProposals({ accounts: [
      { ...insta, url: 'https://www.tiktok.com/@ana' },
      { ...insta, url: 'https://www.instagram.com/p/abc123/' },
      { ...insta, url: 'http://www.instagram.com/ana/' },
      { ...insta, url: 'pas un lien' },
      { ...insta, platform: 'myspace' },
      { ...insta, platform: 'youtube', url: 'https://www.youtube.com/watch?v=abc' },
      { ...insta, platform: 'other', url: 'https://www.instagram.com/ana/' },
    ] }, [])).toEqual([]);
  });

  it('écarte les comptes déjà reliés et les doublons, et met les comptes sûrs en premier', () => {
    const result = cleanProposals({ accounts: [
      { ...insta, platform: 'tiktok', url: 'https://www.tiktok.com/@anatech', confidence: 'likely' },
      insta,
      { ...insta, url: 'https://instagram.com/ana.tech' },
      { ...insta, platform: 'youtube', url: 'https://www.youtube.com/@Ana' },
      { ...insta, platform: 'other', handle: 'Site', url: 'https://ana.tech/', followers: 0 },
    ] }, [{ platform: 'youtube', handle: '@ana', url: 'https://www.youtube.com/@ana' }]);
    expect(result.map(item => [item.platform, item.handle, item.followers])).toEqual([['instagram', '@ana.tech', 12400], ['other', 'Site', null], ['tiktok', '@anatech', 12400]]);
  });

  it('rend une liste vide pour une réponse mal formée', () => {
    expect(cleanProposals(null, [])).toEqual([]);
    expect(cleanProposals({ accounts: 'non' }, [])).toEqual([]);
  });
});

describe('networksPrompt et responseCost', () => {
  it('donne au modèle les comptes, la description et les sources entre balises', () => {
    const prompt = networksPrompt({ name: 'Ana', known: [{ platform: 'youtube', handle: '@ana', url: 'https://www.youtube.com/@ana' }], youtubeDescriptions: ['Mon insta : instagram.com/ana.tech'], sources: [{ tool: 'NordVPN', url: 'https://www.youtube.com/watch?v=x' }] });
    expect(prompt).toContain('Créateur : Ana');
    expect(prompt).toContain('- YouTube : @ana (https://www.youtube.com/@ana)');
    expect(prompt).toContain('instagram.com/ana.tech');
    expect(prompt).toContain('- NordVPN : https://www.youtube.com/watch?v=x');
    expect(prompt.indexOf('<donnees>')).toBeLessThan(prompt.indexOf('Comptes déjà reliés'));
  });

  it('compte les jetons et 1 centime par recherche', () => {
    expect(responseCost({ model: 'claude-sonnet-5-5', usage: { input_tokens: 10_000, output_tokens: 1_000, server_tool_use: { web_search_requests: 3, web_fetch_requests: 0 } } as never }))
      .toEqual({ costUsdMicros: 10_000 * 2 + 1_000 * 10 + 3 * SEARCH_USD_MICROS, searches: 3 });
  });
});

describe('findCreatorNetworks', () => {
  let db: Db;
  let creatorId: string;
  const config = aiConfigFrom({ ANTHROPIC_API_KEY: 'k' });
  const usage = (searches: number) => ({ input_tokens: 1000, output_tokens: 100, server_tool_use: { web_search_requests: searches, web_fetch_requests: 0 } });
  const report = (input: unknown, searches = 2) => ({ model: 'claude-haiku-5-5', stop_reason: 'tool_use', usage: usage(searches), content: [{ type: 'text', text: 'Voilà.' }, { type: 'tool_use', id: 't1', name: 'report_networks', input }] });

  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' });
    await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
    const created = await createCode(db, { toolSlug: 'nordvpn', creatorName: 'Ana', code: 'ANA10', discount: '-10 %', sourceUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', sourceTitle: '', creatorLink: null, note: null, status: 'verified' });
    if (!created.ok) throw new Error(created.error);
    creatorId = (await db.select().from(schema.creators))[0].id;
    await db.insert(schema.creatorAccounts).values({ creatorId, platform: 'youtube', externalId: CHANNEL_ID, handle: '@ana', url: 'https://www.youtube.com/@ana' });
  });

  it('demande une IA active et un plafond non atteint', async () => {
    const create = vi.fn();
    expect(await findCreatorNetworks(db, { ai: { config: aiConfigFrom({}), create: null } }, creatorId)).toEqual({ ok: false, error: 'L’IA n’est pas encore activée.' });
    await db.insert(schema.aiUsage).values({ purpose: 'podcast_notes', model: 'm', costUsdMicros: 999_000_000 });
    expect(await findCreatorNetworks(db, { ai: { config, create } }, creatorId)).toEqual({ ok: false, error: 'Le plafond de l’IA est atteint pour ce mois.' });
    expect(create).not.toHaveBeenCalled();
  });

  it('lit la description YouTube, cherche sur le web et compte le coût dans le plafond', async () => {
    const create = vi.fn(async () => report({ accounts: [insta], note: '' }));
    const readChannel = vi.fn(async () => ({ externalId: CHANNEL_ID, title: 'Ana', handle: '@ana', url: 'https://www.youtube.com/@ana', subscribers: 5000, description: 'Insta : instagram.com/ana.tech' }));
    const result = await findCreatorNetworks(db, { ai: { config, create: create as never }, readChannel }, creatorId);
    expect(result).toMatchObject({ ok: true, data: { proposals: [{ platform: 'instagram', handle: '@ana.tech' }], searches: 2 } });
    expect(readChannel).toHaveBeenCalledWith({ by: 'id', value: CHANNEL_ID });
    const params = (create.mock.calls[0] as unknown as [{ model: string; tools: { type?: string; name: string; max_uses?: number }[]; messages: { content: string }[] }])[0];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.tools[0]).toMatchObject({ type: 'web_search_20250305', max_uses: 3 });
    expect(params.messages[0].content).toContain('Insta : instagram.com/ana.tech');
    expect(params.messages[0].content).toContain('- NordVPN : https://www.youtube.com/watch?v=aaaaaaaaaaa');
    const [spent] = await db.select().from(schema.aiUsage);
    expect(spent).toMatchObject({ purpose: 'creator_networks', ref: 'Ana', costUsdMicros: Math.ceil(1000 * 0.1 + 100 * 0.5) + 2 * SEARCH_USD_MICROS });
  });

  it('relance quand l’API rend la main en pleine recherche', async () => {
    const paused = { model: 'claude-haiku-5-5', stop_reason: 'pause_turn', usage: usage(1), content: [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'Ana' } }] };
    const create = vi.fn().mockResolvedValueOnce(paused).mockResolvedValueOnce(report({ accounts: [], note: 'Rien trouvé.' }, 1));
    const result = await findCreatorNetworks(db, { ai: { config, create } }, creatorId);
    expect(result).toEqual({ ok: true, data: { proposals: [], note: 'Rien trouvé.', searches: 2, costUsdMicros: 2 * (150 + SEARCH_USD_MICROS) } });
    const second = (create.mock.calls[1] as unknown as [{ messages: { role: string }[] }])[0];
    expect(second.messages.map(message => message.role)).toEqual(['user', 'assistant']);
  });

  it('dit quand l’IA n’a rien rendu, en comptant quand même la dépense', async () => {
    const create = vi.fn(async () => ({ model: 'claude-haiku-5-5', stop_reason: 'end_turn', usage: usage(1), content: [{ type: 'text', text: 'Je ne sais pas.' }] }));
    expect(await findCreatorNetworks(db, { ai: { config, create: create as never } }, creatorId)).toEqual({ ok: false, error: 'L’IA n’a pas pu terminer la recherche. Réessaie dans un moment.' });
    expect(await db.select().from(schema.aiUsage)).toHaveLength(1);
  });

  it('refuse un créateur inconnu', async () => {
    expect(await findCreatorNetworks(db, { ai: { config, create: vi.fn() } }, '00000000-0000-4000-8000-000000000000')).toEqual({ ok: false, error: 'Créateur introuvable.' });
  });
});
