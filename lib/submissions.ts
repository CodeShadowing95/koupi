import { createHash } from 'node:crypto';
import { and, desc, eq, gte, inArray, lt } from 'drizzle-orm';
import type { Db } from '@/db';
import { moderationLogs, submissions, type Submission } from '@/db/schema';

export type SubmissionInput = {
  toolName: string; creatorName: string; code: string; discountLabel: string; sourceUrl: string;
  category?: string; creatorLink?: string; comment?: string; submitterEmail?: string;
};

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

export const statusFilters = ['new', 'approved', 'rejected', 'duplicate', 'all'] as const;
export type StatusFilter = typeof statusFilters[number];
export function isStatusFilter(value: string): value is StatusFilter { return (statusFilters as readonly string[]).includes(value); }

export type SubmissionFilters = { status: StatusFilter; category?: string; from?: string | null; to?: string | null };

export async function listSubmissions(db: Db, filters: SubmissionFilters): Promise<Submission[]> {
  const conditions = [];
  if (filters.status !== 'all') conditions.push(eq(submissions.status, filters.status));
  if (filters.category) conditions.push(eq(submissions.category, filters.category));
  if (filters.from) conditions.push(gte(submissions.createdAt, new Date(`${filters.from}T00:00:00.000Z`)));
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    conditions.push(lt(submissions.createdAt, end));
  }
  return db.select().from(submissions).where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(submissions.createdAt)).limit(100);
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
