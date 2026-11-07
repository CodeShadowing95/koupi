import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { loadCatalog } from './catalog-db';
import { applyCodeAction, correctCode, createCode, parseCodeInput, toolOptions, updateCode, type CodeInput } from './codes-admin';
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
  it('range le code en majuscules et refuse un code mal formé', () => {
    const body = { toolSlug: 'nordvpn', creatorName: 'Ana', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=a' };
    expect(parseCodeInput({ ...body, code: '  merci-20 ' })).toMatchObject({ ok: true, data: { code: 'MERCI-20' } });
    for (const code of ['<script>alert(1)</script>', 'MERCI 20', 'A'.repeat(41)]) expect(parseCodeInput({ ...body, code })).toMatchObject({ ok: false, error: expect.stringContaining('lettres, des chiffres, des tirets') });
    expect(parseCodeInput({ ...body, code: ' ' })).toEqual({ ok: false, error: 'Indique le code, ou le lien de l’offre s’il n’y a pas de code.' });
  });

  it('dit ce qui manque pour un nouvel outil', () => {
    const body = { creatorName: 'Ana', code: 'X', discount: '-10 %', sourceUrl: 'https://tiktok.com/@ana/video/1' };
    expect(parseCodeInput({ ...body, newTool: { name: 'Runway', categorySlug: '', website: 'runwayml.com' } })).toEqual({ ok: false, error: 'Pour un nouvel outil, indique son nom, sa catégorie et son site.' });
    expect(parseCodeInput({ ...body, newTool: { name: 'Runway', categorySlug: 'ia', website: 'not a site' } })).toEqual({ ok: false, error: 'Le site officiel de l’outil doit être une adresse web valide.' });
  });

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

  it('enregistre une offre donnée seulement par un lien, sans code, et refuse son doublon', async () => {
    const parsed = parseCodeInput({ toolSlug: 'nordvpn', creatorName: 'Ana', code: '', discount: '-20 %', sourceUrl: 'https://youtube.com/watch?v=a', creatorLink: 'https://nordvpn.com/ana' });
    expect(parsed).toMatchObject({ ok: true, data: { code: '', creatorLink: 'https://nordvpn.com/ana' } });
    if (!parsed.ok) return;
    const created = await createCode(db, parsed.data);
    expect(created.ok).toBe(true);
    const [row] = await db.select().from(schema.codes);
    expect(row.code).toBeNull();
    const catalog = await loadCatalog(db);
    expect(catalog.codes[0]).toMatchObject({ code: '', creatorLink: 'https://nordvpn.com/ana' });
    // Le même lien sans code pour le même outil fait doublon ; un vrai code à côté reste possible.
    expect(await createCode(db, { ...parsed.data, creatorLink: 'https://NordVPN.com/ana' })).toMatchObject({ ok: false, error: 'Cette offre par lien existe déjà pour cet outil.' });
    expect((await createCode(db, { ...parsed.data, code: 'ANA20' })).ok).toBe(true);
  });

  it('refuse en base une offre sans code ni lien', async () => {
    const [creator] = await db.insert(schema.creators).values({ slug: 'ana', name: 'Ana' }).returning();
    const [tool] = await db.select().from(schema.tools);
    await expect(db.insert(schema.codes).values({ toolId: tool.id, creatorId: creator.id, code: null, discount: '-20 %', sourceUrl: 'https://youtube.com/watch?v=a' })).rejects.toThrow();
  });

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

  it('note l’origine : à la main, puis codes du site sans origine', async () => {
    await createCode(db, base);
    const [row] = await db.select({ origin: schema.codes.origin }).from(schema.codes);
    expect(row.origin).toBe('manual');
    expect((await loadCatalog(db, { includeArchived: true })).codes[0].origin).toBe('manual');
    expect((await loadCatalog(db)).codes[0].origin).toBeUndefined();
  });

  it('réutilise le créateur du même nom et crée un nouvel outil si besoin', async () => {
    await createCode(db, base);
    const result = await createCode(db, { ...base, toolSlug: undefined, newTool: { name: 'Runway', categorySlug: 'ia', website: 'https://runwayml.com' }, creatorName: 'tutorial stack', code: 'RUN' });
    expect(result.ok).toBe(true);
    expect(await db.select().from(schema.creators)).toHaveLength(1);
    expect((await toolOptions(db)).map(tool => tool.slug)).toEqual(['nordvpn', 'runway']);
    expect((await toolOptions(db)).find(tool => tool.slug === 'runway')?.website).toBe('https://runwayml.com');
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

  it('note le test au paiement, et l’efface si le code est rejeté', async () => {
    const created = await createCode(db, base);
    if (!created.ok) throw new Error(created.error);
    expect(await applyCodeAction(db, created.data.id, 'payment_test')).toEqual({ ok: true, data: { status: 'verified', archived: false } });
    let [row] = await db.select().from(schema.codes).where(eq(schema.codes.id, created.data.id));
    expect(row.paymentTestedAt).not.toBeNull();
    expect(row.lastTestedAt).not.toBeNull();
    await applyCodeAction(db, created.data.id, 'reject');
    [row] = await db.select().from(schema.codes).where(eq(schema.codes.id, created.data.id));
    expect(row).toMatchObject({ status: 'rejected', paymentTestedAt: null });
    expect((await db.select().from(schema.codeLogs)).map(log => log.action)).toEqual(['create', 'payment_test', 'reject']);
  });

  it('garde la date de fin, et la retire quand l’admin confirme un code après cette date', async () => {
    const created = await createCode(db, { ...base, expiresOn: '2020-01-01' });
    if (!created.ok) throw new Error(created.error);
    const future = await createCode(db, { ...base, code: 'LATER', expiresOn: '2999-12-31' });
    if (!future.ok) throw new Error(future.error);
    await applyCodeAction(db, created.data.id, 'verify');
    await applyCodeAction(db, future.data.id, 'verify');
    const rows = await db.select().from(schema.codes);
    expect(rows.find(row => row.id === created.data.id)?.expiresOn).toBeNull();
    expect(rows.find(row => row.id === future.data.id)?.expiresOn).toBe('2999-12-31');
  });

  it('refuse une date de fin impossible', () => {
    const body = { toolSlug: 'nordvpn', creatorName: 'Ana', code: 'X', discount: '-10 %', sourceUrl: 'https://youtube.com/watch?v=a' };
    expect(parseCodeInput({ ...body, expiresOn: '2026-02-31' })).toEqual({ ok: false, error: 'La date de fin doit être une date valide.' });
    expect(parseCodeInput({ ...body, expiresOn: '2026-12-31' })).toMatchObject({ ok: true, data: { expiresOn: '2026-12-31' } });
    expect(parseCodeInput(body)).toMatchObject({ ok: true, data: { expiresOn: null } });
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

  it('refuse un deuxième code identique pour le même outil, casse ignorée', async () => {
    const first = await createCode(db, base);
    if (!first.ok) throw new Error(first.error);
    expect(await createCode(db, { ...base, code: 'ytstack', creatorName: 'Autre' })).toEqual({ ok: false, error: 'Le code YTSTACK existe déjà pour cet outil.', duplicateId: first.data.id });
    await db.insert(schema.tools).values({ slug: 'surfshark', name: 'Surfshark', categorySlug: 'vpn', website: 'https://surfshark.com' });
    expect(await createCode(db, { ...base, toolSlug: 'surfshark' })).toMatchObject({ ok: true });
    expect(await db.select().from(schema.codes)).toHaveLength(2);
  });

  it('signale un doublon archivé pour qu’on le restaure', async () => {
    const first = await createCode(db, base);
    if (!first.ok) throw new Error(first.error);
    await applyCodeAction(db, first.data.id, 'archive');
    expect(await createCode(db, base)).toMatchObject({ ok: false, error: expect.stringContaining('dans les archives'), duplicateId: first.data.id });
  });

  it('ne valide pas une proposition dont le code est déjà au catalogue', async () => {
    const first = await createCode(db, base);
    if (!first.ok) throw new Error(first.error);
    await db.insert(schema.submissions).values({ toolName: 'NordVPN', creatorName: 'Léa', code: 'YTSTACK', discountLabel: '-20 %', sourceUrl: 'https://instagram.com/p/1', ipHash: 'h', fingerprint: 'f' });
    const [submission] = await db.select().from(schema.submissions);
    expect(await createCode(db, base, { submissionId: submission.id })).toMatchObject({ ok: false, duplicateId: first.data.id });
    const [after] = await db.select().from(schema.submissions);
    expect(after.status).toBe('new');
  });

  it('refuse de renommer un code en un code qui existe déjà, mais garde le sien', async () => {
    const first = await createCode(db, base);
    const second = await createCode(db, { ...base, code: 'OTHER' });
    if (!first.ok || !second.ok) throw new Error('setup');
    expect(await updateCode(db, second.data.id, base)).toMatchObject({ ok: false, duplicateId: first.data.id });
    expect(await updateCode(db, first.data.id, { ...base, discount: '-80 %' })).toEqual({ ok: true, data: { id: first.data.id } });
  });
});

describe('correction du code depuis Vérifications', () => {
  it('remplace le code et la réduction, garde le reste et note la correction', async () => {
    const db = await freshDb();
    const created = await createCode(db, { ...base, code: 'NORDVPN', status: 'pending' });
    if (!created.ok) throw new Error(created.error);
    expect(await correctCode(db, created.data.id, { code: ' cq410 ', discount: '-30 %' })).toEqual({ ok: true, data: { code: 'CQ410', discount: '-30 %' } });
    const [row] = await db.select().from(schema.codes).where(eq(schema.codes.id, created.data.id));
    expect(row).toMatchObject({ code: 'CQ410', discount: '-30 %', status: 'pending', sourceUrl: base.sourceUrl });
    const logs = await db.select().from(schema.codeLogs).where(eq(schema.codeLogs.codeId, created.data.id));
    expect(logs.at(-1)).toMatchObject({ action: 'edit', previousStatus: 'pending', nextStatus: 'pending', note: 'Corrigé depuis Vérifications : code NORDVPN → CQ410, réduction modifiée.' });
  });

  it('garde la réduction quand elle est vide, refuse un code mal formé ou déjà au catalogue', async () => {
    const db = await freshDb();
    const first = await createCode(db, base);
    const second = await createCode(db, { ...base, code: 'OTHER' });
    if (!first.ok || !second.ok) throw new Error('setup');
    expect(await correctCode(db, second.data.id, { code: 'NEW1', discount: ' ' })).toEqual({ ok: true, data: { code: 'NEW1', discount: base.discount } });
    expect(await correctCode(db, second.data.id, { code: 'NEW 1' })).toMatchObject({ ok: false, error: expect.stringContaining('sans espace') });
    expect(await correctCode(db, second.data.id, { code: 'ytstack' })).toMatchObject({ ok: false, duplicateId: first.data.id });
    expect(await correctCode(db, '00000000-0000-0000-0000-000000000000', { code: 'X1' })).toEqual({ ok: false, error: 'Code introuvable.' });
  });
});
