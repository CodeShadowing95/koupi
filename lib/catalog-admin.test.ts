import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { loadCatalog } from './catalog-db';
import { createCategory, createTool, listCategoriesAdmin, listFamilies, listCreatorsAdmin, listToolsAdmin, parseToolInput, renameCategory, updateCreatorProfile, setToolArchived, updateTool } from './catalog-admin';
import { createCode } from './codes-admin';
import { parseCreatorBio } from './creator-bio';

async function setup() {
  const db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.categories).values([{ slug: 'vpn', name: 'VPN' }, { slug: 'ia', name: 'IA' }]);
  return db;
}
const nord = { name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com', description: null, priority: 1 };
const code = { creatorName: 'Ana', code: 'ANA', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=1', sourceTitle: '', creatorLink: null, note: null };

describe('formulaire outil', () => {
  it('ajoute https:// et refuse une priorité hors bornes', () => {
    expect(parseToolInput({ name: 'Canva', categorySlug: 'ia', website: 'canva.com' })).toMatchObject({ ok: true, data: { website: 'https://canva.com', priority: 3 } });
    expect(parseToolInput({ name: 'Canva', categorySlug: 'ia', website: 'canva.com', priority: 9 })).toMatchObject({ ok: false });
    expect(parseToolInput({ name: '', categorySlug: 'ia', website: 'canva.com' })).toMatchObject({ ok: false });
  });
});

describe('présentation du créateur', () => {
  it('nettoie les espaces, garde un saut de paragraphe et refuse un texte trop long', () => {
    expect(parseCreatorBio(undefined)).toEqual({ ok: true, data: null });
    expect(parseCreatorBio('   ')).toEqual({ ok: true, data: null });
    expect(parseCreatorBio('Ligne 1  \r\n\n\n\n  Ligne   2 ')).toEqual({ ok: true, data: 'Ligne 1\n\nLigne 2' });
    expect(parseCreatorBio('x'.repeat(400))).toMatchObject({ ok: true });
    expect(parseCreatorBio('x'.repeat(401))).toMatchObject({ ok: false });
    expect(parseCreatorBio(42)).toMatchObject({ ok: false });
  });
});

describe('catalogue dans l’admin', () => {
  let db: Db;
  beforeEach(async () => { db = await setup(); });

  it('crée et modifie un outil sans changer son adresse', async () => {
    const created = await createTool(db, nord);
    if (!created.ok) throw new Error(created.error);
    expect(created.data.slug).toBe('nordvpn');
    expect(await createTool(db, { ...nord, name: 'nordvpn' })).toEqual({ ok: false, error: 'Un outil porte déjà ce nom.' });
    expect(await updateTool(db, created.data.id, { ...nord, name: 'NordVPN Pro', categorySlug: 'ia', priority: 2 })).toMatchObject({ ok: true });
    const [tool] = await listToolsAdmin(db);
    expect(tool).toMatchObject({ slug: 'nordvpn', name: 'NordVPN Pro', category: 'IA', priority: 2, codes: 0, visible: 0, archived: false, creators: 0 });
  });

  it('compte les codes et retire du site un outil archivé', async () => {
    await createTool(db, nord);
    await createCode(db, { ...code, toolSlug: 'nordvpn', status: 'verified' });
    await createCode(db, { ...code, toolSlug: 'nordvpn', code: 'HID', status: 'pending' });
    let [tool] = await listToolsAdmin(db);
    expect(tool).toMatchObject({ codes: 2, visible: 1 });
    expect((await loadCatalog(db)).tools).toHaveLength(1);
    await setToolArchived(db, tool.id, true);
    [tool] = await listToolsAdmin(db);
    expect(tool.archived).toBe(true);
    expect(await loadCatalog(db)).toMatchObject({ tools: [], codes: [] });
    await setToolArchived(db, tool.id, false);
    expect((await loadCatalog(db)).tools).toHaveLength(1);
  });

  it('liste et renomme les créateurs', async () => {
    await createTool(db, nord);
    await createCode(db, { ...code, toolSlug: 'nordvpn', status: 'to_test' });
    const [creator] = await listCreatorsAdmin(db);
    expect(creator).toMatchObject({ name: 'Ana', slug: 'ana', codes: 1, visible: 1, tools: ['NordVPN'] });
    expect(creator.bio).toBeNull();
    expect(await updateCreatorProfile(db, creator.id, { name: 'Ana Créa', bio: '  Tests d’outils  IA.  ' })).toMatchObject({ ok: true });
    expect((await listCreatorsAdmin(db))[0]).toMatchObject({ name: 'Ana Créa', slug: 'ana', bio: 'Tests d’outils IA.' });
    expect(await updateCreatorProfile(db, creator.id, { name: '  ' })).toMatchObject({ ok: false });
    expect(await updateCreatorProfile(db, creator.id, { name: 'Ana Créa' })).toMatchObject({ ok: true });
    expect((await listCreatorsAdmin(db))[0].bio).toBe('Tests d’outils IA.');
    expect(await updateCreatorProfile(db, creator.id, { name: 'Ana', bio: 'x'.repeat(401) })).toMatchObject({ ok: false });
    expect((await listCreatorsAdmin(db))[0].bio).toBe('Tests d’outils IA.');
    expect(await updateCreatorProfile(db, creator.id, { name: 'Ana', bio: '' })).toMatchObject({ ok: true });
    expect((await listCreatorsAdmin(db))[0].bio).toBeNull();
    expect(await updateCreatorProfile(db, '00000000-0000-4000-8000-000000000000', { name: 'Ana' })).toEqual({ ok: false, error: 'Créateur introuvable.' });
  });

  it('crée et renomme une catégorie, avec la couverture', async () => {
    await createTool(db, nord);
    await createCode(db, { ...code, toolSlug: 'nordvpn', status: 'verified' });
    expect(await createCategory(db, 'Création et design')).toEqual({ ok: true, data: { slug: 'creation-et-design' } });
    expect(await createCategory(db, 'vpn')).toEqual({ ok: false, error: 'Cette catégorie existe déjà.' });
    expect(await renameCategory(db, 'vpn', 'VPN et sécurité')).toMatchObject({ ok: true });
    expect(await renameCategory(db, 'ia', 'VPN et sécurité')).toMatchObject({ ok: false });
    expect((await listCategoriesAdmin(db)).sort((a, b) => a.slug.localeCompare(b.slug))).toEqual([
      { slug: 'creation-et-design', name: 'Création et design', familySlug: null, family: null, tools: 0, covered: 0, universe: 'outils-en-ligne' },
      { slug: 'ia', name: 'IA', familySlug: null, family: null, tools: 0, covered: 0, universe: 'outils-en-ligne' },
      { slug: 'vpn', name: 'VPN et sécurité', familySlug: null, family: null, tools: 1, covered: 1, universe: 'outils-en-ligne' },
    ]);
  });

  it('range une catégorie dans une famille, ou l’en sort', async () => {
    const families = await listFamilies(db);
    expect(families).toHaveLength(14);
    expect(families[0]).toEqual({ slug: 'securite', name: 'Sécurité et vie privée', position: 1, universe: 'outils-en-ligne' });
    expect(await createCategory(db, 'Gestionnaires de mots de passe', 'securite')).toMatchObject({ ok: true });
    expect(await createCategory(db, 'Antivirus', 'inconnue')).toEqual({ ok: false, error: 'Cette famille n’existe pas.' });
    expect(await renameCategory(db, 'vpn', 'VPN', 'securite')).toMatchObject({ ok: true });
    expect(await renameCategory(db, 'ia', 'IA', '../x')).toEqual({ ok: false, error: 'Famille invalide.' });
    const bySlug = async (slug: string) => (await listCategoriesAdmin(db)).find(category => category.slug === slug);
    expect(await bySlug('vpn')).toMatchObject({ familySlug: 'securite', family: 'Sécurité et vie privée' });
    expect(await bySlug('gestionnaires-de-mots-de-passe')).toMatchObject({ familySlug: 'securite' });
    // Renommer sans donner de famille la garde ; une famille vide l'enlève.
    await renameCategory(db, 'vpn', 'VPN et sécurité');
    expect(await bySlug('vpn')).toMatchObject({ familySlug: 'securite' });
    await renameCategory(db, 'vpn', 'VPN et sécurité', '');
    expect(await bySlug('vpn')).toMatchObject({ familySlug: null, family: null });
  });
});
