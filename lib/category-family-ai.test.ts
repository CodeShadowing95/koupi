import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { aiConfigFrom } from './ai-extract';
import { createFamily } from './catalog-admin';
import { cleanFamily, suggestCategoryFamily } from './category-family-ai';

const reply = (body: Record<string, unknown>) => vi.fn(async () => ({ model: 'claude-haiku-5-5', stop_reason: 'end_turn', usage: { input_tokens: 400, output_tokens: 60 }, content: [{ type: 'text', text: JSON.stringify(body) }] }));
const families = [{ slug: 'securite', name: 'Sécurité et vie privée' }, { slug: 'video', name: 'Vidéo' }];
// Les 14 familles des migrations : une nouvelle famille passe en 15e position.

describe('cleanFamily', () => {
  it('keeps a listed family, or a new name, and maps a known name to its family', () => {
    expect(cleanFamily({ family_slug: 'video', new_family: 'X', reason: 'r' }, families)).toEqual({ familySlug: 'video', newFamily: '', reason: 'r' });
    expect(cleanFamily({ family_slug: 'nope', new_family: ' Santé et bien-être ', reason: '' }, families)).toEqual({ familySlug: '', newFamily: 'Santé et bien-être', reason: '' });
    expect(cleanFamily({ family_slug: '', new_family: 'vidéo', reason: '' }, families)).toEqual({ familySlug: 'video', newFamily: '', reason: '' });
    expect(cleanFamily({ family_slug: '', new_family: '', reason: '' }, families)).toBeNull();
    expect(cleanFamily('oops', families)).toBeNull();
  });
});

describe('suggestCategoryFamily', () => {
  let db: Db;
  beforeEach(async () => {
    db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    // Les migrations créent déjà les familles (Sécurité et vie privée, Vidéo…) et la catégorie VPN.
    await db.insert(schema.categories).values({ slug: 'vpn', name: 'VPN' }).onConflictDoNothing();
    await db.insert(schema.tools).values({ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' });
  });
  const on = (create: unknown) => ({ ai: { config: aiConfigFrom({ ANTHROPIC_API_KEY: 'k' }), create: create as never } });

  it('needs a name and an active AI', async () => {
    expect(await suggestCategoryFamily(db, { ai: { config: aiConfigFrom({}), create: null } }, { name: 'VPN' })).toEqual({ ok: false, error: 'L’IA n’est pas encore activée.' });
    expect(await suggestCategoryFamily(db, on(reply({})), { name: ' ' })).toEqual({ ok: false, error: 'Indique d’abord le nom de la catégorie.' });
    await db.insert(schema.aiUsage).values({ purpose: 'podcast_notes', model: 'm', costUsdMicros: 999_000_000 });
    expect(await suggestCategoryFamily(db, on(reply({})), { name: 'VPN' })).toEqual({ ok: false, error: 'Le plafond de l’IA est atteint pour ce mois.' });
  });

  it('sends the category, its tools and the families, and counts the cost', async () => {
    const create = reply({ family_slug: 'securite', new_family: '', reason: 'Protège la connexion.' });
    expect(await suggestCategoryFamily(db, on(create), { name: 'VPN', slug: 'vpn' })).toEqual({ ok: true, data: { familySlug: 'securite', newFamily: '', reason: 'Protège la connexion.' } });
    const prompt = (create.mock.calls[0] as unknown as [{ messages: { content: string }[] }])[0].messages[0].content;
    expect(prompt).toContain('Outils : NordVPN');
    expect(prompt).toContain('- securite : Sécurité et vie privée');
    const [usage] = await db.select().from(schema.aiUsage);
    expect(usage).toMatchObject({ purpose: 'category_family', ref: 'VPN' });
  });

  it('proposes a new family when none fits', async () => {
    expect(await suggestCategoryFamily(db, on(reply({ family_slug: '', new_family: 'Santé et bien-être', reason: 'r' })), { name: 'Compléments alimentaires' }))
      .toEqual({ ok: true, data: { familySlug: '', newFamily: 'Santé et bien-être', reason: 'r' } });
  });
});

describe('createFamily', () => {
  it('creates a family after the others, and reuses one with the same name', async () => {
    const db = drizzle(new PGlite(), { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    expect(await createFamily(db, ' Santé et bien-être ')).toEqual({ ok: true, data: { slug: 'sante-et-bien-etre', name: 'Santé et bien-être' } });
    const [row] = await db.select().from(schema.categoryFamilies).where((await import('drizzle-orm')).eq(schema.categoryFamilies.slug, 'sante-et-bien-etre'));
    expect(row.position).toBe(15);
    expect(await createFamily(db, 'VIDÉO')).toEqual({ ok: true, data: { slug: 'video', name: 'Vidéo' } });
    expect(await createFamily(db, '  ')).toEqual({ ok: false, error: 'Indique le nom de la famille.' });
  });
});
