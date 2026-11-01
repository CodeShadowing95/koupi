import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { loadCatalog } from './catalog-db';
import { applyCodeAction, createCode, parseCodeInput, toolOptions, updateCode, type CodeInput } from './codes-admin';
import { createSubmission, listSubmissions } from './submissions';

async function freshDb() {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: 'db/migrations' });
  await db.insert(schema.categories).values([{ slug: 'ia', name: 'IA' }, { slug: 'vpn', name: 'VPN' }]);
  await db.insert(schema.tools).values([{ slug: 'nordvpn', name: 'NordVPN', categorySlug: 'vpn', website: 'https://nordvpn.com' }]);
  return db as unknown as Db;
}

const base: CodeInput = {
  toolSlug: 'nordvpn', creatorName: 'Tutorial Stack', code: 'YTSTACK', discount: '-76 %', sourceUrl: 'https://youtube.com/watch?v=a',
  sourceTitle: 'Ma vidéo', creatorLink: null, status: 'to_test', note: null,
};

describe('validation du formulaire', () => {
  it('accepte un code complet et ajoute https:// au site d’un nouvel outil', () => {
    const parsed = parseCodeInput({ newTool: { name: 'Runway', categorySlug: 'ia', website: 'runwayml.com' }, creatorName: 'Ana', code: 'X', discount: '-10 %', sourceUrl: 'https://tiktok.com/@ana/video/1' });
    expect(parsed).toMatchObject({ ok: true, data: { newTool: { website: 'https://runwayml.com' }, status: 'to_test', creatorLink: null } });
  });

  it('refuse un lien source invalide, un statut inconnu ou un outil manquant', () => {
    expect(parseCodeInput({ toolSlug: 'a', creatorName: 'A', code: 'X', discount: 'd', sourceUrl: 'javascript:alert(1)' })).toMatchObject({ ok: false });
    expect(parseCodeInput({ toolSlug: 'a', creatorName: 'A', code: 'X', discount: 'd', sourceUrl: 'https://x.fr', status: 'published' })).toMatchObject({ ok: false });
    expect(parseCodeInput({ creatorName: 'A', code: 'X', discount: 'd', sourceUrl: 'https://x.fr' })).toMatchObject({ ok: false, error: 'Choisis l’outil.' });
    expect(parseCodeInput({ toolSlug: 'a', creatorName: 'A', code: 'X', discount: 'd', sourceUrl: 'https://x.fr', creatorLink: 'ftp://x' })).toMatchObject({ ok: false });
  });
});

describe('actions de l’admin', () => {
  let db: Db;
  beforeEach(async () => { db = await freshDb(); });

  it('crée un code, son créateur, et l’inscrit au journal', async () => {
    const result = await createCode(db, base);
    expect(result.ok).toBe(true);
    const catalog = await loadCatalog(db);
    expect(catalog.codes).toHaveLength(1);
    expect(catalog.codes[0]).toMatchObject({ code: 'YTSTACK', creator: 'Tutorial Stack', creatorSlug: 'tutorial-stack', status: 'to_test', lastTestedAt: null });
    expect(catalog.tools.map(tool => tool.slug)).toEqual(['nordvpn']);
    const logs = await db.select().from(schema.codeLogs);
    expect(logs.map(log => log.action)).toEqual(['create']);
  });

  it('réutilise le créateur du même nom et crée un nouvel outil si besoin', async () => {
    await createCode(db, base);
    const result = await createCode(db, { ...base, toolSlug: undefined, newTool: { name: 'Runway', categorySlug: 'ia', website: 'https://runwayml.com' }, creatorName: 'tutorial stack', code: 'RUN' });
    expect(result.ok).toBe(true);
    expect(await db.select().from(schema.creators)).toHaveLength(1);
    expect((await toolOptions(db)).map(tool => tool.slug)).toEqual(['nordvpn', 'runway']);
    expect(await createCode(db, { ...base, toolSlug: 'inconnu' })).toEqual({ ok: false, error: 'Outil introuvable.' });
  });

  it('note la date du test quand un code est vérifié ou rejeté', async () => {
    const created = await createCode(db, base);
    if (!created.ok) throw new Error(created.error);
    await applyCodeAction(db, created.data.id, 'verify');
    let [code] = (await loadCatalog(db)).codes;
    expect(code.status).toBe('verified');
    expect(code.lastTestedAt).not.toBeNull();
    await applyCodeAction(db, created.data.id, 'pending');
    [code] = (await loadCatalog(db)).codes;
    expect(code.status).toBe('pending');
    expect((await loadCatalog(db)).tools).toEqual([]);
  });

  it('archive un code sans le supprimer, puis le restaure', async () => {
    const created = await createCode(db, base);
    if (!created.ok) throw new Error(created.error);
    await applyCodeAction(db, created.data.id, 'archive');
    expect((await loadCatalog(db)).codes).toEqual([]);
    expect((await loadCatalog(db, { includeArchived: true })).codes[0]).toMatchObject({ archived: true });
    await applyCodeAction(db, created.data.id, 'restore');
    expect((await loadCatalog(db)).codes).toHaveLength(1);
    expect((await db.select().from(schema.codeLogs)).map(log => log.action)).toEqual(['create', 'archive', 'restore']);
  });

  it('modifie un code', async () => {
    const created = await createCode(db, base);
    if (!created.ok) throw new Error(created.error);
    expect(await updateCode(db, created.data.id, { ...base, discount: '-80 %', status: 'verified' })).toMatchObject({ ok: true });
    const [code] = (await loadCatalog(db)).codes;
    expect(code).toMatchObject({ discount: '-80 %', status: 'verified' });
    expect(code.lastTestedAt).not.toBeNull();
    expect(await updateCode(db, '00000000-0000-0000-0000-000000000000', base)).toEqual({ ok: false, error: 'Code introuvable.' });
  });

  it('valide une proposition en créant le code qui lui est relié, une seule fois', async () => {
    await createSubmission(db, { toolName: 'NordVPN', creatorName: 'Léa', code: 'LEA20', discountLabel: '-20 %', sourceUrl: 'https://instagram.com/p/1' }, 'h');
    const [submission] = await listSubmissions(db, { status: 'new' });
    const result = await createCode(db, { ...base, creatorName: 'Léa', code: 'LEA20' }, { submissionId: submission.id });
    if (!result.ok) throw new Error(result.error);
    const [after] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, submission.id));
    expect(after).toMatchObject({ status: 'approved', createdCodeId: result.data.id });
    const [code] = await db.select().from(schema.codes).where(eq(schema.codes.id, result.data.id));
    expect(code.submissionId).toBe(submission.id);
    expect(await db.select().from(schema.moderationLogs)).toHaveLength(1);
    expect(await createCode(db, base, { submissionId: submission.id })).toEqual({ ok: false, error: 'Cette proposition a déjà donné un code.' });
  });
});
