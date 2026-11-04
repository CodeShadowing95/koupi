import { createHash } from 'node:crypto';
import { and, count, desc, eq, gte, inArray, lt } from 'drizzle-orm';
import type { Db } from '@/db';
import { moderationLogs, submissions, type Submission } from '@/db/schema';

export type SubmissionInput = {
  toolName: string; creatorName: string; code: string; discountLabel: string; sourceUrl: string;
  category?: string; creatorLink?: string; comment?: string; submitterEmail?: string;
};

/** Réduction enregistrée quand le créateur n'en annonce pas : le même libellé que l'import des codes trouvés sur YouTube. */
export const DEFAULT_DISCOUNT = 'Offre du créateur';
/** Un même code peut valoir pour plusieurs outils (une vidéo qui en présente plusieurs) : 5 au plus par envoi. */
export const MAX_TOOLS_PER_SUBMISSION = 5;

/** Les outils d'un envoi : nettoyés, sans doublon (casse ignorée), 5 au plus. Accepte aussi l'ancien champ unique. */
export function toolNamesOf(value: unknown, single?: unknown): string[] {
  const raw = Array.isArray(value) ? value : [single];
  const out: string[] = [];
  for (const item of raw) {
    const name = typeof item === 'string' ? item.trim().slice(0, 120) : '';
    if (name && !out.some(known => known.toLocaleLowerCase('fr-FR') === name.toLocaleLowerCase('fr-FR'))) out.push(name);
  }
  return out.slice(0, MAX_TOOLS_PER_SUBMISSION);
}

export function fingerprintOf(toolName: string, code: string): string {
  return createHash('sha256').update(`${toolName.toLocaleLowerCase('fr-FR')}::${code.toLocaleLowerCase('fr-FR')}`).digest('hex');
}

export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

// Enregistre une proposition. Si le même couple outil + code est déjà en attente ou validé, elle est marquée doublon.
export async function createSubmission(db: Db, input: SubmissionInput, ipHash: string): Promise<{ status: Submission['status'] }> {
  const fingerprint = fingerprintOf(input.toolName, input.code);
  const duplicate = await db.select({ id: submissions.id }).from(submissions)
    .where(and(eq(submissions.fingerprint, fingerprint), inArray(submissions.status, ['new', 'approved'])))
    .limit(1);
  const status = duplicate.length > 0 ? 'duplicate' : 'new';
  await db.insert(submissions).values({
    toolName: input.toolName,
    creatorName: input.creatorName,
    category: input.category || null,
    code: input.code,
    discountLabel: input.discountLabel,
    sourceUrl: input.sourceUrl,
    creatorLink: input.creatorLink || null,
    comment: input.comment || null,
    submitterEmail: input.submitterEmail || null,
    ipHash,
    fingerprint,
    status,
    adminNote: status === 'duplicate' ? 'Proposition similaire déjà présente.' : null,
  });
  return { status };
}

/** Une ligne d'un envoi : un outil et son code (une vidéo lue peut en donner plusieurs). */
export type SubmissionItem = { toolName: string; code: string; discountLabel: string };
/** Lignes par envoi au plus : les codes trouvés dans une vidéo, ou un code pour plusieurs outils. */
export const MAX_ITEMS_PER_SUBMISSION = 8;

/**
 * Les lignes d'un envoi : la liste « items » (bon pré-rempli depuis une vidéo), sinon un code pour un ou plusieurs outils.
 * Nettoyées, sans ligne incomplète ni doublon outil + code (casse ignorée), 8 au plus.
 */
export function submissionItemsOf(body: Record<string, unknown>): SubmissionItem[] {
  const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  const raw: unknown[] = Array.isArray(body.items) ? body.items
    : toolNamesOf(body.toolNames, body.toolName).map(toolName => ({ toolName, code: body.code, discountLabel: body.discountLabel }));
  const out: SubmissionItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const toolName = text(item.toolName, 120), code = text(item.code, 120), discountLabel = text(item.discountLabel, 240);
    if (!toolName || !code) continue;
    if (out.some(known => fingerprintOf(known.toolName, known.code) === fingerprintOf(toolName, code))) continue;
    out.push({ toolName, code, discountLabel });
  }
  return out.slice(0, MAX_ITEMS_PER_SUBMISSION);
}

/** Un envoi de plusieurs lignes : une proposition par outil et par code, que l'admin valide une à une. */
export async function createSubmissions(db: Db, input: Omit<SubmissionInput, 'toolName' | 'code' | 'discountLabel'> & { items: SubmissionItem[] }, ipHash: string): Promise<{ status: Submission['status'] }[]> {
  const { items, ...rest } = input;
  const results = [];
  for (const item of items) results.push(await createSubmission(db, { ...rest, ...item, discountLabel: item.discountLabel || DEFAULT_DISCOUNT }, ipHash));
  return results;
}

export const statusFilters = ['new', 'approved', 'rejected', 'duplicate', 'all'] as const;
export type StatusFilter = typeof statusFilters[number];
export function isStatusFilter(value: string): value is StatusFilter { return (statusFilters as readonly string[]).includes(value); }

export type SubmissionFilters = { status: StatusFilter; category?: string; from?: string | null; to?: string | null };

/** Catégorie et période : ce que filtrent la liste et les nombres des onglets. */
function periodConditions(filters: Omit<SubmissionFilters, 'status'>) {
  const conditions = [];
  if (filters.category) conditions.push(eq(submissions.category, filters.category));
  if (filters.from) conditions.push(gte(submissions.createdAt, new Date(`${filters.from}T00:00:00.000Z`)));
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    conditions.push(lt(submissions.createdAt, end));
  }
  return conditions;
}

export async function listSubmissions(db: Db, filters: SubmissionFilters): Promise<Submission[]> {
  const conditions = periodConditions(filters);
  if (filters.status !== 'all') conditions.push(eq(submissions.status, filters.status));
  return db.select().from(submissions).where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(submissions.createdAt)).limit(100);
}

/** Nombre de propositions par statut (et au total), avec les mêmes filtres de catégorie et de période que la liste. */
export async function countSubmissions(db: Db, filters: Omit<SubmissionFilters, 'status'> = {}): Promise<Record<StatusFilter, number>> {
  const conditions = periodConditions(filters);
  const rows = await db.select({ status: submissions.status, n: count() }).from(submissions)
    .where(conditions.length ? and(...conditions) : undefined).groupBy(submissions.status);
  const counts: Record<StatusFilter, number> = { new: 0, approved: 0, rejected: 0, duplicate: 0, all: 0 };
  for (const row of rows) {
    if (row.status in counts) counts[row.status as StatusFilter] = Number(row.n);
    counts.all += Number(row.n);
  }
  return counts;
}

export type ModerationAction = 'approve' | 'reject' | 'mark_duplicate' | 'restore';
export const moderationActions: ModerationAction[] = ['approve', 'reject', 'mark_duplicate', 'restore'];

const nextStatusOf: Record<ModerationAction, Submission['status']> = { approve: 'approved', reject: 'rejected', mark_duplicate: 'duplicate', restore: 'new' };

// Applique une décision et l'ajoute au journal. Renvoie null si la proposition n'existe pas.
export async function moderateSubmission(db: Db, id: string, action: ModerationAction, note: string | null): Promise<Submission['status'] | null> {
  const [current] = await db.select({ status: submissions.status }).from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!current) return null;
  const nextStatus = nextStatusOf[action];
  await db.update(submissions).set({ status: nextStatus, adminNote: note, reviewedAt: new Date() }).where(eq(submissions.id, id));
  await db.insert(moderationLogs).values({ submissionId: id, action, previousStatus: current.status, nextStatus, note });
  return nextStatus;
}
