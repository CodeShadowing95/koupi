// Demandes venues de la page publique d'un créateur : « C'est ma page » (revendication) et « Page incorrecte »
// (signalement). En attendant l'espace créateur, l'admin les traite à la main (page Demandes des créateurs).
import { count, desc, eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { CREATOR_REQUEST_STATUSES, creatorRequests, creators } from '@/db/schema';
import { isMerkodFoundSlug } from './merkod-found';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };
export type CreatorRequestKind = 'claim' | 'report';
export type CreatorRequestStatus = typeof CREATOR_REQUEST_STATUSES[number];
export type CreatorRequestInput = { slug: string; kind: CreatorRequestKind; email: string | null; accountUrl: string | null; message: string | null };

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function httpUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.') ? url.toString() : null;
  } catch { return null; }
}

/** Vérifie une demande envoyée par un visiteur. Revendication : e-mail et lien du compte obligatoires. Signalement : un message. */
export function parseCreatorRequest(body: Record<string, unknown>): Parsed<CreatorRequestInput> {
  const kind = body.kind === 'claim' || body.kind === 'report' ? body.kind : null;
  if (!kind) return { ok: false, error: 'Type de demande inconnu.' };
  const slug = clean(body.slug, 200);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { ok: false, error: 'Créateur inconnu.' };
  const email = clean(body.email, 320) || null;
  if (email && !EMAIL.test(email)) return { ok: false, error: 'L’adresse e-mail semble invalide.' };
  const rawUrl = clean(body.accountUrl, 1000);
  const accountUrl = httpUrl(rawUrl);
  if (rawUrl && !accountUrl) return { ok: false, error: 'Le lien du compte doit être une adresse web valide.' };
  const message = clean(body.message, 1000) || null;
  if (kind === 'claim') {
    if (!email) return { ok: false, error: 'Indique ton e-mail : c’est par là qu’on te recontacte.' };
    if (!accountUrl) return { ok: false, error: 'Indique le lien de ton compte (chaîne, profil…).' };
  } else if (!message) {
    return { ok: false, error: 'Dis-nous ce qui ne va pas sur cette page.' };
  }
  return { ok: true, data: { slug, kind, email, accountUrl, message } };
}

export async function createCreatorRequest(db: Db, input: CreatorRequestInput, ipHash: string): Promise<Parsed<{ id: string }>> {
  const [creator] = await db.select({ id: creators.id }).from(creators).where(eq(creators.slug, input.slug)).limit(1);
  if (!creator || isMerkodFoundSlug(input.slug)) return { ok: false, error: 'Créateur inconnu.' };
  const [row] = await db.insert(creatorRequests).values({
    creatorId: creator.id, kind: input.kind, email: input.email, accountUrl: input.accountUrl, message: input.message, ipHash,
  }).returning({ id: creatorRequests.id });
  return { ok: true, data: row };
}

export type AdminCreatorRequest = {
  id: string; kind: CreatorRequestKind; status: CreatorRequestStatus; email: string | null; accountUrl: string | null; message: string | null;
  adminNote: string | null; createdAt: string; handledAt: string | null; creator: { id: string; slug: string; name: string };
};

/** Toutes les demandes, les plus récentes d'abord (l'adresse IP n'est jamais renvoyée). */
export async function listCreatorRequests(db: Db): Promise<AdminCreatorRequest[]> {
  const rows = await db.select({ request: creatorRequests, creator: { id: creators.id, slug: creators.slug, name: creators.name } })
    .from(creatorRequests).innerJoin(creators, eq(creatorRequests.creatorId, creators.id))
    .orderBy(desc(creatorRequests.createdAt));
  return rows.map(({ request, creator }) => ({
    id: request.id, kind: request.kind, status: request.status, email: request.email, accountUrl: request.accountUrl, message: request.message,
    adminNote: request.adminNote, createdAt: request.createdAt.toISOString(), handledAt: request.handledAt?.toISOString() ?? null, creator,
  }));
}

export async function countOpenCreatorRequests(db: Db): Promise<number> {
  const [row] = await db.select({ n: count() }).from(creatorRequests).where(eq(creatorRequests.status, 'new'));
  return row?.n ?? 0;
}

/** Traiter, écarter ou rouvrir une demande, avec une note facultative pour soi. */
export async function updateCreatorRequest(db: Db, id: string, body: Record<string, unknown>, now = new Date()): Promise<Parsed<{ id: string }>> {
  const status = CREATOR_REQUEST_STATUSES.find(value => value === body.status);
  if (!status) return { ok: false, error: 'Statut inconnu.' };
  const note = body.adminNote === undefined ? undefined : clean(body.adminNote, 500) || null;
  const rows = await db.update(creatorRequests)
    .set({ status, handledAt: status === 'new' ? null : now, ...(note === undefined ? {} : { adminNote: note }) })
    .where(eq(creatorRequests.id, id))
    .returning({ id: creatorRequests.id });
  return rows.length ? { ok: true, data: { id } } : { ok: false, error: 'Demande introuvable.' };
}
