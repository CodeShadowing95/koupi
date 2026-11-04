// La migration 0018 reclasse une base existante (catégories d'origine) dans les nouvelles catégories de data/.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { asc, eq } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';

const reclassify = readFileSync('db/migrations/0018_category_reclassify.sql', 'utf8').split('--> statement-breakpoint');

async function run(client: PGlite) {
  for (const statement of reclassify) await client.exec(statement);
}

describe('migration 0018 : reclassement des catégories', () => {
  it('déplace les outils des catégories d’origine, garde les choix de l’admin et retire les catégories vidées', async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    // Une base d'avant : catégories d'origine, outils dedans, et un outil que l'admin a mis dans sa propre catégorie.
    await db.insert(schema.categories).values([
      { slug: 'vpn-et-securite', name: 'VPN et sécurité', familySlug: 'securite' },
      { slug: 'ia', name: 'IA', familySlug: 'ia' },
      { slug: 'hebergement-web', name: 'Hébergement web', familySlug: 'hebergement' },
      { slug: 'mes-outils', name: 'Mes outils' },
    ]);
    await db.insert(schema.tools).values([
      { slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn-et-securite', website: 'https://nordvpn.com' },
      { slug: 'nordpass', name: 'NordPass', categorySlug: 'vpn-et-securite', website: 'https://nordpass.com' },
      { slug: 'hostinger', name: 'Hostinger', categorySlug: 'hebergement-web', website: 'https://hostinger.fr' },
      { slug: 'claude', name: 'Claude', categorySlug: 'mes-outils', website: 'https://claude.ai' },
      { slug: 'outil-maison', name: 'Outil maison', categorySlug: 'ia', website: 'https://exemple.fr' },
    ]);
    await run(client);

    const category = async (tool: string) => (await db.select({ slug: schema.tools.categorySlug }).from(schema.tools).where(eq(schema.tools.slug, tool)))[0].slug;
    expect(await category('nordvpn')).toBe('vpn');
    expect(await category('nordpass')).toBe('gestionnaires-de-mots-de-passe');
    expect(await category('hostinger')).toBe('hebergement-web');
    // Rangé par l'admin hors des catégories d'origine : on n'y touche pas.
    expect(await category('claude')).toBe('mes-outils');
    // Outil inconnu de data/ : il garde sa catégorie, qui reste donc.
    expect(await category('outil-maison')).toBe('ia');

    const rows = await db.select().from(schema.categories).orderBy(asc(schema.categories.createdAt));
    const slugs = rows.map(row => row.slug);
    expect(slugs).not.toContain('vpn-et-securite');
    expect(slugs).toContain('ia');
    expect(slugs).toContain('mes-outils');
    expect(rows.find(row => row.slug === 'vpn')).toMatchObject({ name: 'VPN', familySlug: 'securite' });
    expect(rows.find(row => row.slug === 'sciences-maths-et-code')).toMatchObject({ name: 'Sciences, maths et code', familySlug: 'formation' });
    // Les nouvelles catégories suivent l'ordre de data/categories.csv, Hébergement web compris.
    const ordered = slugs.filter(slug => !['ia', 'mes-outils'].includes(slug));
    expect(ordered.slice(0, 5)).toEqual(['vpn', 'gestionnaires-de-mots-de-passe', 'antivirus', 'suppression-de-donnees-personnelles', 'hebergement-web']);
    expect(ordered).toHaveLength(48);

    // Rejouer ne change rien.
    await run(client);
    expect(await db.select().from(schema.categories)).toHaveLength(rows.length);
  });

  it('ne fait rien sur une base neuve : l’import crée les catégories', async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema }) as unknown as Db;
    await migrate(db as never, { migrationsFolder: 'db/migrations' });
    expect(await db.select().from(schema.categories)).toEqual([]);
  });
});
