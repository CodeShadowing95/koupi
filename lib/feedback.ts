// Avis des visiteurs (page « Ton avis », ADR-0029) : une remarque, une idée ou un problème, avec un e-mail facultatif
// pour pouvoir répondre. L'admin les lit dans Retours et les fait passer de Nouveau à Lu puis Traité.
import { count, desc, eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { FEEDBACK_KINDS, FEEDBACK_STATUSES, feedback } from '@/db/schema';

export type FeedbackKind = typeof FEEDBACK_KINDS[number];
export type FeedbackStatus = typeof FEEDBACK_STATUSES[number];
export type FeedbackInput = { kind: FeedbackKind; message: string; email: string | null; fromPath: string | null };
type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = { remark: 'Remarque', idea: 'Idée', problem: 'Problème' };
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = { new: 'Nouveau', read: 'Lu', done: 'Traité' };
export const MAX_FEEDBACK_CHARS = 2000;

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Chemin d'une page du site (« /codes »), sans domaine, requête ni fragment. null sinon. */
function sitePath(value: unknown): string | null {
  const raw = clean(value, 300);
  return /^\/(?!\/)[\w\-/.~%]*$/.test(raw) ? raw : null;
}

/** Vérifie un avis envoyé par un visiteur. Seul le message est obligatoire. */
export function parseFeedback(body: Record<string, unknown>): Parsed<FeedbackInput> {
  const kind = FEEDBACK_KINDS.find(value => value === body.kind);
  if (!kind) return { ok: false, error: 'Choisis le type de ton avis.' };
  const message = clean(body.message, MAX_FEEDBACK_CHARS);
  if (message.length < 3) return { ok: false, error: 'Écris quelques mots : ce qui t’a plu, gêné ou manqué.' };
  const email = clean(body.email, 320) || null;
  if (email && !EMAIL.test(email)) return { ok: false, error: 'L’adresse e-mail semble invalide.' };
  return { ok: true, data: { kind, message, email, fromPath: sitePath(body.fromPath) } };
}

export async function createFeedback(db: Db, input: FeedbackInput, ipHash: string): Promise<{ id: string }> {
  const [row] = await db.insert(feedback).values({ ...input, ipHash }).returning({ id: feedback.id });
  return row;
}

export type AdminFeedback = {
  id: string; kind: FeedbackKind; status: FeedbackStatus; message: string; email: string | null; fromPath: string | null;
  adminNote: string | null; createdAt: string; handledAt: string | null;
};

/** Tous les avis, les plus récents d'abord (l'empreinte de l'adresse IP n'est jamais renvoyée). */
export async function listFeedback(db: Db): Promise<AdminFeedback[]> {
  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  return rows.map(row => ({
    id: row.id, kind: row.kind, status: row.status, message: row.message, email: row.email, fromPath: row.fromPath,
    adminNote: row.adminNote, createdAt: row.createdAt.toISOString(), handledAt: row.handledAt?.toISOString() ?? null,
  }));
}

/** Avis pas encore lus : le nombre du menu. */
export async function countNewFeedback(db: Db): Promise<number> {
  const [row] = await db.select({ n: count() }).from(feedback).where(eq(feedback.status, 'new'));
  return row?.n ?? 0;
}

/** Change le statut d'un avis, avec une note facultative pour soi. */
export async function updateFeedback(db: Db, id: string, body: Record<string, unknown>, now = new Date()): Promise<Parsed<{ id: string }>> {
  const status = FEEDBACK_STATUSES.find(value => value === body.status);
  if (!status) return { ok: false, error: 'Statut inconnu.' };
  const note = body.adminNote === undefined ? undefined : clean(body.adminNote, 500) || null;
  const rows = await db.update(feedback)
    .set({ status, handledAt: status === 'done' ? now : null, ...(note === undefined ? {} : { adminNote: note }) })
    .where(eq(feedback.id, id))
    .returning({ id: feedback.id });
  return rows.length ? { ok: true, data: { id } } : { ok: false, error: 'Avis introuvable.' };
}
