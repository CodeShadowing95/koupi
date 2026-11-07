// Actions de l'admin sur le catalogue : créer et modifier un code, changer son statut, l'archiver.
// Chaque action est inscrite dans code_logs. Une proposition validée devient un code relié à elle.
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { categories, codeLogs, codes, creators, moderationLogs, submissions, tools, CODE_STATUSES, type CodeRow } from '@/db/schema';
import { slugify } from './slug';
import { isValidDay, todayInParis } from './code-expiry';
import { codeFormatError, normalizeCode } from './code-format';

export type CodeStatus = typeof CODE_STATUSES[number];
export type NewTool = { name: string; categorySlug: string; website: string };
export type CodeInput = {
  /** Outil existant (slug), ou nouvel outil à créer. */
  toolSlug?: string;
  newTool?: NewTool;
  creatorName: string;
  code: string;
  discount: string;
  sourceUrl: string;
  sourceTitle: string;
  creatorLink: string | null;
  status: CodeStatus;
  note: string | null;
  /** Date de fin AAAA-MM-JJ, null si le code n'en a pas. */
  expiresOn?: string | null;
};

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };
/** Une erreur d'enregistrement : duplicateId est le code du catalogue qui porte déjà ce code pour cet outil. */
export type SaveResult<T> = { ok: true; data: T } | { ok: false; error: string; duplicateId?: string };

function text(value: unknown, max: number): string { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export function validUrl(value: string): boolean {
  try { const url = new URL(value); return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname); } catch { return false; }
}
function isStatus(value: unknown): value is CodeStatus { return (CODE_STATUSES as readonly unknown[]).includes(value); }

/** Valide le formulaire d'un code envoyé par l'admin. */
export function parseCodeInput(body: Record<string, unknown>): Parsed<CodeInput> {
  const toolSlug = text(body.toolSlug, 120);
  const rawTool = body.newTool && typeof body.newTool === 'object' ? body.newTool as Record<string, unknown> : null;
  let newTool: NewTool | undefined;
  if (rawTool) {
    const website = text(rawTool.website, 300);
    newTool = { name: text(rawTool.name, 120), categorySlug: text(rawTool.categorySlug, 80), website: /^https?:\/\//i.test(website) ? website : website ? `https://${website}` : '' };
    if (!newTool.name || !newTool.categorySlug || !newTool.website) return { ok: false, error: 'Pour un nouvel outil, indique son nom, sa catégorie et son site.' };
    if (!validUrl(newTool.website)) return { ok: false, error: 'Le site officiel de l’outil doit être une adresse web valide.' };
  } else if (!toolSlug) return { ok: false, error: 'Choisis l’outil.' };

  const creatorName = text(body.creatorName, 160), code = normalizeCode(text(body.code, 120)), discount = text(body.discount, 240);
  const sourceUrl = text(body.sourceUrl, 1000), sourceTitle = text(body.sourceTitle, 300), creatorLink = text(body.creatorLink, 1000);
  if (!creatorName || !slugify(creatorName)) return { ok: false, error: 'Indique le créateur.' };
  const codeError = codeFormatError(code);
  if (codeError) return { ok: false, error: codeError };
  if (!discount) return { ok: false, error: 'Indique la réduction.' };
  if (!validUrl(sourceUrl)) return { ok: false, error: 'Le lien source doit être une adresse web valide.' };
  if (creatorLink && !validUrl(creatorLink)) return { ok: false, error: 'Le lien du créateur doit être une adresse web valide.' };
  const expiresOn = text(body.expiresOn, 10);
  if (expiresOn && !isValidDay(expiresOn)) return { ok: false, error: 'La date de fin doit être une date valide.' };
  const status = body.status ?? 'to_test';
  if (!isStatus(status)) return { ok: false, error: 'Statut invalide.' };
  return { ok: true, data: { ...(newTool ? { newTool } : { toolSlug }), creatorName, code, discount, sourceUrl, sourceTitle, creatorLink: creatorLink || null, status, note: text(body.note, 1000) || null, expiresOn: expiresOn || null } };
}

async function resolveTool(db: Db, input: Pick<CodeInput, 'toolSlug' | 'newTool'>): Promise<Parsed<string>> {
  if (input.newTool) {
    const { name, categorySlug, website } = input.newTool;
    const [category] = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.slug, categorySlug)).limit(1);
    if (!category) return { ok: false, error: 'Catégorie inconnue.' };
    const [existing] = await db.select({ id: tools.id }).from(tools).where(sql`lower(${tools.name}) = lower(${name})`).limit(1);
    if (existing) return { ok: true, data: existing.id };
    const slug = slugify(name);
    if (!slug) return { ok: false, error: 'Nom d’outil invalide.' };
    const [created] = await db.insert(tools).values({ slug, name, categorySlug, website }).onConflictDoNothing().returning({ id: tools.id });
    if (created) return { ok: true, data: created.id };
    const [bySlug] = await db.select({ id: tools.id }).from(tools).where(eq(tools.slug, slug)).limit(1);
    return bySlug ? { ok: true, data: bySlug.id } : { ok: false, error: 'Impossible de créer l’outil.' };
  }
  const [tool] = await db.select({ id: tools.id }).from(tools).where(and(eq(tools.slug, input.toolSlug ?? ''), isNull(tools.archivedAt))).limit(1);
  return tool ? { ok: true, data: tool.id } : { ok: false, error: 'Outil introuvable.' };
}

/** Le créateur du même nom (même slug), créé s'il n'existe pas encore. */
export async function resolveCreator(db: Db, name: string): Promise<string> {
  const slug = slugify(name);
  await db.insert(creators).values({ slug, name }).onConflictDoNothing();
  const [creator] = await db.select({ id: creators.id }).from(creators).where(eq(creators.slug, slug)).limit(1);
  return creator.id;
}

/** Date du test : on la note quand l'admin décide qu'un code marche (vérifié) ou non (rejeté). */
function testedAt(status: CodeStatus, previous: CodeStatus | null, current: Date | null): Date | null {
  return (status === 'verified' || status === 'rejected') && status !== previous ? new Date() : current;
}

/** Le code de cet outil qui a déjà ce code (casse ignorée, archivés compris), en dehors de celui qu'on modifie. */
export async function findCatalogDuplicate(db: Db, toolId: string, code: string, exceptId?: string): Promise<{ id: string; archived: boolean } | null> {
  const conditions = [eq(codes.toolId, toolId), sql`upper(${codes.code}) = ${normalizeCode(code)}`];
  if (exceptId) conditions.push(ne(codes.id, exceptId));
  const [row] = await db.select({ id: codes.id, archivedAt: codes.archivedAt }).from(codes).where(and(...conditions)).limit(1);
  return row ? { id: row.id, archived: Boolean(row.archivedAt) } : null;
}

function duplicateError(code: string, duplicate: { id: string; archived: boolean }): SaveResult<never> {
  const error = duplicate.archived
    ? `Le code ${normalizeCode(code)} existe déjà pour cet outil, dans les archives. Restaure-le plutôt que d’en créer un deuxième.`
    : `Le code ${normalizeCode(code)} existe déjà pour cet outil.`;
  return { ok: false, error, duplicateId: duplicate.id };
}

export async function createCode(db: Db, input: CodeInput, options: { submissionId?: string } = {}): Promise<SaveResult<{ id: string }>> {
  const tool = await resolveTool(db, input);
  if (!tool.ok) return tool;
  const duplicate = await findCatalogDuplicate(db, tool.data, input.code);
  if (duplicate) return duplicateError(input.code, duplicate);
  if (options.submissionId) {
    const [submission] = await db.select({ status: submissions.status, createdCodeId: submissions.createdCodeId }).from(submissions).where(eq(submissions.id, options.submissionId)).limit(1);
    if (!submission) return { ok: false, error: 'Proposition introuvable.' };
    if (submission.createdCodeId) return { ok: false, error: 'Cette proposition a déjà donné un code.' };
  }
  const creatorId = await resolveCreator(db, input.creatorName);
  const [created] = await db.insert(codes).values({
    toolId: tool.data, creatorId, code: input.code, discount: input.discount, sourceUrl: input.sourceUrl, sourceTitle: input.sourceTitle,
    creatorLink: input.creatorLink, status: input.status, note: input.note, submissionId: options.submissionId ?? null, expiresOn: input.expiresOn ?? null,
    origin: options.submissionId ? 'submission' : 'manual',
    lastTestedAt: testedAt(input.status, null, null),
  }).returning({ id: codes.id });
  await db.insert(codeLogs).values({ codeId: created.id, action: 'create', nextStatus: input.status });

  if (options.submissionId) {
    const [previous] = await db.select({ status: submissions.status }).from(submissions).where(eq(submissions.id, options.submissionId)).limit(1);
    await db.update(submissions).set({ status: 'approved', createdCodeId: created.id, reviewedAt: new Date() }).where(eq(submissions.id, options.submissionId));
    await db.insert(moderationLogs).values({ submissionId: options.submissionId, action: 'approve', previousStatus: previous?.status ?? null, nextStatus: 'approved', note: input.note });
  }
  return { ok: true, data: { id: created.id } };
}

async function currentCode(db: Db, id: string): Promise<CodeRow | undefined> {
  const [row] = await db.select().from(codes).where(eq(codes.id, id)).limit(1);
  return row;
}

/** Remplace les champs d'un code. Renvoie une erreur si le code n'existe pas. */
export async function updateCode(db: Db, id: string, input: CodeInput): Promise<SaveResult<{ id: string }>> {
  const current = await currentCode(db, id);
  if (!current) return { ok: false, error: 'Code introuvable.' };
  const tool = await resolveTool(db, input);
  if (!tool.ok) return tool;
  const duplicate = await findCatalogDuplicate(db, tool.data, input.code, id);
  if (duplicate) return duplicateError(input.code, duplicate);
  const creatorId = await resolveCreator(db, input.creatorName);
  await db.update(codes).set({
    toolId: tool.data, creatorId, code: input.code, discount: input.discount, sourceUrl: input.sourceUrl, sourceTitle: input.sourceTitle,
    creatorLink: input.creatorLink, status: input.status, note: input.note, updatedAt: new Date(),
    lastTestedAt: testedAt(input.status, current.status, current.lastTestedAt),
    ...(input.expiresOn !== undefined ? { expiresOn: input.expiresOn } : {}),
  }).where(eq(codes.id, id));
  await db.insert(codeLogs).values({ codeId: id, action: 'edit', previousStatus: current.status, nextStatus: input.status });
  return { ok: true, data: { id } };
}

/**
 * Correction rapide depuis Vérifications : l'admin remplace le code (et la réduction) quand le repérage
 * a pris le mauvais mot. Le reste du code ne bouge pas ; la correction est inscrite dans code_logs.
 */
export async function correctCode(db: Db, id: string, body: Record<string, unknown>): Promise<SaveResult<{ code: string; discount: string }>> {
  const code = normalizeCode(text(body.code, 120));
  const codeError = codeFormatError(code);
  if (codeError) return { ok: false, error: codeError };
  const current = await currentCode(db, id);
  if (!current) return { ok: false, error: 'Code introuvable.' };
  const discount = text(body.discount, 240) || current.discount;
  const duplicate = await findCatalogDuplicate(db, current.toolId, code, id);
  if (duplicate) return duplicateError(code, duplicate);
  await db.update(codes).set({ code, discount, updatedAt: new Date() }).where(eq(codes.id, id));
  const changes = [current.code !== code ? `code ${current.code} → ${code}` : null, current.discount !== discount ? 'réduction modifiée' : null].filter(Boolean);
  await db.insert(codeLogs).values({ codeId: id, action: 'edit', previousStatus: current.status, nextStatus: current.status, note: changes.length ? `Corrigé depuis Vérifications : ${changes.join(', ')}.` : null });
  return { ok: true, data: { code, discount } };
}

export const CODE_QUICK_ACTIONS = ['verify', 'payment_test', 'reject', 'to_test', 'pending', 'archive', 'restore'] as const;
export type CodeQuickAction = typeof CODE_QUICK_ACTIONS[number];
export function isQuickAction(value: unknown): value is CodeQuickAction { return (CODE_QUICK_ACTIONS as readonly unknown[]).includes(value); }

const statusOf: Partial<Record<CodeQuickAction, CodeStatus>> = { verify: 'verified', payment_test: 'verified', reject: 'rejected', to_test: 'to_test', pending: 'pending' };

/**
 * Action rapide depuis la liste : vérifié (testé, il marche), testé au paiement (vérifié, et la réduction
 * s'applique au paiement), rejeté (testé, il ne marche pas), à tester (visible sans test), en attente (masqué),
 * archiver (retiré de partout) ou restaurer.
 */
export async function applyCodeAction(db: Db, id: string, action: CodeQuickAction, note: string | null = null): Promise<Parsed<{ status: CodeStatus; archived: boolean }>> {
  const current = await currentCode(db, id);
  if (!current) return { ok: false, error: 'Code introuvable.' };
  const now = new Date();
  if (action === 'archive' || action === 'restore') {
    const archivedAt = action === 'archive' ? now : null;
    await db.update(codes).set({ archivedAt, updatedAt: now }).where(eq(codes.id, id));
    await db.insert(codeLogs).values({ codeId: id, action, previousStatus: current.status, nextStatus: current.status, note });
    return { ok: true, data: { status: current.status, archived: Boolean(archivedAt) } };
  }
  const status = statusOf[action]!;
  // Vérifier ou rejeter, c'est avoir testé : on note la date même si le statut ne change pas.
  const tested = action === 'verify' || action === 'payment_test' || action === 'reject';
  const lastTestedAt = tested ? now : current.lastTestedAt;
  await db.update(codes).set({
    status, lastTestedAt, updatedAt: now,
    // Un code rejeté perd son test au paiement : s'il revient, il devra être retesté pour le retrouver.
    ...(action === 'payment_test' ? { paymentTestedAt: now } : action === 'reject' ? { paymentTestedAt: null } : {}),
    // L'admin confirme qu'un code marche après sa date de fin : cette date était fausse, on la retire.
    ...((action === 'verify' || action === 'payment_test') && current.expiresOn && current.expiresOn < todayInParis(now) ? { expiresOn: null } : {}),
  }).where(eq(codes.id, id));
  await db.insert(codeLogs).values({ codeId: id, action, previousStatus: current.status, nextStatus: status, note });
  return { ok: true, data: { status, archived: Boolean(current.archivedAt) } };
}

/** website : le site officiel, où l'admin essaie un code. */
export type ToolOption = { slug: string; name: string; category: string; website: string };

/** Tous les outils suivis (même sans code), pour les listes de choix de l'admin. */
export async function toolOptions(db: Db): Promise<ToolOption[]> {
  const rows = await db.select({ slug: tools.slug, name: tools.name, category: categories.name, website: tools.website }).from(tools)
    .innerJoin(categories, eq(tools.categorySlug, categories.slug)).where(isNull(tools.archivedAt));
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
