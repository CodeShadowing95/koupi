// Connexion des créateurs par lien magique (ADR-0021). Pas de mot de passe : un lien envoyé par e-mail,
// valable 20 minutes et une seule fois. Seule l'empreinte du jeton est gardée en base.
// Se connecter ne donne accès à aucune page : l'admin relie l'e-mail à un créateur après la preuve par la bio.
import { createHash, randomBytes } from 'node:crypto';
import { and, asc, desc, eq, gt, gte, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, creatorAccounts, creatorRequests, creatorSignInTokens, creatorUsers, creators, dailyCounters } from '@/db/schema';
import { monthStart } from './creator-directory';
import { CONTACT_EMAIL } from './site-contact';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export const SIGN_IN_MINUTES = 20;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PLATFORM_ORDER = ['youtube', 'tiktok', 'instagram', 'twitch', 'snapchat', 'x', 'podcast', 'other'];

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const newSignInToken = () => randomBytes(32).toString('base64url');

/** E-mail en minuscules, ou null s'il n'a pas la forme d'une adresse. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 320 && EMAIL.test(email) ? email : null;
}

export type SignInRequest = { email: string; slug: string | null };

export function parseSignInRequest(body: Record<string, unknown>): Parsed<SignInRequest> {
  const email = normalizeEmail(body.email);
  if (!email) return { ok: false, error: 'Indique une adresse e-mail valide.' };
  const slug = typeof body.slug === 'string' && body.slug ? body.slug.trim().slice(0, 200) : null;
  if (slug !== null && !SLUG.test(slug)) return { ok: false, error: 'Créateur inconnu.' };
  return { ok: true, data: { email, slug } };
}

export type SignInContext = { ipHash: string; appUrl: string; now?: Date; newToken?: () => string };
export type SignInLink = { link: string; creatorName: string | null };

/**
 * Prépare un lien de connexion. Avec une page (slug), enregistre aussi la revendication pour l'admin,
 * une seule fois par e-mail et par page tant qu'elle n'est pas traitée.
 */
export async function createSignInLink(db: Db, input: SignInRequest, context: SignInContext): Promise<Parsed<SignInLink>> {
  const now = context.now ?? new Date();
  let creatorName: string | null = null;
  if (input.slug) {
    const [creator] = await db.select({ id: creators.id, name: creators.name }).from(creators).where(eq(creators.slug, input.slug)).limit(1);
    if (!creator) return { ok: false, error: 'Créateur inconnu.' };
    creatorName = creator.name;
    const [open] = await db.select({ id: creatorRequests.id }).from(creatorRequests)
      .where(and(eq(creatorRequests.creatorId, creator.id), eq(creatorRequests.kind, 'claim'), eq(creatorRequests.email, input.email), eq(creatorRequests.status, 'new')))
      .limit(1);
    if (!open) {
      const accounts = await db.select({ platform: creatorAccounts.platform, url: creatorAccounts.url }).from(creatorAccounts).where(eq(creatorAccounts.creatorId, creator.id));
      accounts.sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));
      await db.insert(creatorRequests).values({
        creatorId: creator.id, kind: 'claim', email: input.email, ipHash: context.ipHash,
        accountUrl: accounts[0]?.url ?? `${context.appUrl}/creators/${input.slug}`,
        message: 'Revendication envoyée depuis « Pour les créateurs », avec la connexion par e-mail.',
      });
    }
  }
  const token = (context.newToken ?? newSignInToken)();
  await db.insert(creatorSignInTokens).values({
    email: input.email, tokenHash: hashToken(token), creatorSlug: input.slug, ipHash: context.ipHash,
    expiresAt: new Date(now.getTime() + SIGN_IN_MINUTES * 60_000), createdAt: now,
  });
  return { ok: true, data: { link: `${context.appUrl}/creator/sign-in?token=${encodeURIComponent(token)}`, creatorName } };
}

export const DISABLED = `Ce compte est désactivé. Si tu penses que c’est une erreur, écris-nous à ${CONTACT_EMAIL}.`;
const EXPIRED = 'Ce lien ne marche plus : il a déjà servi ou il a plus de 20 minutes. Demande-en un nouveau, ça prend dix secondes.';

/** Utilise un lien : une seule fois, avant son expiration. Crée le compte Merkod du créateur à la première connexion. */
export async function consumeSignInToken(db: Db, token: string, now = new Date()): Promise<Parsed<{ userId: string; slug: string | null }>> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { ok: false, error: EXPIRED };
  const [used] = await db.update(creatorSignInTokens).set({ usedAt: now })
    .where(and(eq(creatorSignInTokens.tokenHash, hashToken(token)), isNull(creatorSignInTokens.usedAt), gt(creatorSignInTokens.expiresAt, now)))
    .returning({ email: creatorSignInTokens.email, slug: creatorSignInTokens.creatorSlug });
  if (!used) return { ok: false, error: EXPIRED };
  const [blocked] = await db.select({ id: creatorUsers.id }).from(creatorUsers)
    .where(and(eq(creatorUsers.email, used.email), isNotNull(creatorUsers.disabledAt))).limit(1);
  if (blocked) return { ok: false, error: DISABLED };
  const [user] = await db.insert(creatorUsers).values({ email: used.email, lastSignInAt: now, createdAt: now })
    .onConflictDoUpdate({ target: creatorUsers.email, set: { lastSignInAt: now } })
    .returning({ id: creatorUsers.id });
  return { ok: true, data: { userId: user.id, slug: used.slug } };
}

export type CreatorAccount = {
  id: string; email: string;
  /** La page dont il a l'accès, null tant que l'admin ne l'a pas donné. */
  creator: { id: string; slug: string; name: string } | null;
  /** Pages revendiquées avec cet e-mail, en attente de la preuve. */
  claims: { slug: string; name: string }[];
};

/** Compte du créateur connecté. null s'il n'existe plus ou s'il est désactivé : la session ne vaut alors plus rien. */
export async function loadCreatorAccount(db: Db, userId: string): Promise<CreatorAccount | null> {
  const [row] = await db.select({ id: creatorUsers.id, email: creatorUsers.email, creator: { id: creators.id, slug: creators.slug, name: creators.name } })
    .from(creatorUsers).leftJoin(creators, eq(creators.id, creatorUsers.creatorId))
    .where(and(eq(creatorUsers.id, userId), isNull(creatorUsers.disabledAt))).limit(1);
  if (!row) return null;
  const claims = await db.selectDistinct({ slug: creators.slug, name: creators.name }).from(creatorRequests)
    .innerJoin(creators, eq(creators.id, creatorRequests.creatorId))
    .where(and(eq(creatorRequests.kind, 'claim'), eq(creatorRequests.email, row.email), eq(creatorRequests.status, 'new')))
    .orderBy(asc(creators.name));
  return { id: row.id, email: row.email, creator: row.creator?.id ? row.creator : null, claims };
}

/** Copies de chacun de ses codes depuis le début du mois (clé : id du code). */
export async function copiesByCode(db: Db, creatorId: string, now = new Date()): Promise<Map<string, number>> {
  const rows = await db.select({ codeId: codes.id, copies: sql<number>`sum(${dailyCounters.count})::int` })
    .from(dailyCounters)
    .innerJoin(codes, sql`${dailyCounters.key} = ${codes.id}::text`)
    .where(and(eq(codes.creatorId, creatorId), eq(dailyCounters.metric, 'copy'), gte(dailyCounters.day, monthStart(now))))
    .groupBy(codes.id);
  return new Map(rows.map(row => [row.codeId, row.copies]));
}

// ---------- Admin ----------

/** Donne à l'e-mail d'une revendication l'accès à la page du créateur, et la marque traitée. */
export async function grantCreatorAccess(db: Db, requestId: string, now = new Date()): Promise<Parsed<{ userId: string }>> {
  const [request] = await db.select().from(creatorRequests).where(eq(creatorRequests.id, requestId)).limit(1);
  if (!request) return { ok: false, error: 'Demande introuvable.' };
  const email = normalizeEmail(request.email);
  if (request.kind !== 'claim' || !email) return { ok: false, error: 'Seule une revendication avec un e-mail peut donner un accès.' };
  // Garde-fou : pas d'accès tant qu'aucun compte du créateur n'est prouvé par la bio (ADR-0020).
  // Le seuil d'audience ne compte pas ici (ADR-0041) : l'espace est ouvert à tous, la rosette seulement au-dessus du seuil.
  const proven = await db.select({ id: creatorAccounts.id }).from(creatorAccounts)
    .where(and(eq(creatorAccounts.creatorId, request.creatorId), eq(creatorAccounts.claimStatus, 'verified'))).limit(1);
  if (proven.length === 0) return { ok: false, error: 'Fais d’abord prouver un de ses comptes par la bio : l’accès ne se donne qu’au vrai créateur.' };
  const [user] = await db.insert(creatorUsers).values({ email, creatorId: request.creatorId, accessGrantedAt: now, createdAt: now })
    .onConflictDoUpdate({ target: creatorUsers.email, set: { creatorId: request.creatorId, accessGrantedAt: now } })
    .returning({ id: creatorUsers.id });
  await db.update(creatorRequests).set({ status: 'done', handledAt: now }).where(eq(creatorRequests.id, requestId));
  return { ok: true, data: { userId: user.id } };
}

/** Retire l'accès donné à l'e-mail d'une revendication (le compte Merkod reste, sans page). */
export async function revokeCreatorAccess(db: Db, requestId: string): Promise<Parsed<{ revoked: number }>> {
  const [request] = await db.select().from(creatorRequests).where(eq(creatorRequests.id, requestId)).limit(1);
  if (!request) return { ok: false, error: 'Demande introuvable.' };
  const email = normalizeEmail(request.email);
  if (!email) return { ok: false, error: 'Cette demande n’a pas d’e-mail.' };
  const rows = await db.update(creatorUsers).set({ creatorId: null, accessGrantedAt: null })
    .where(and(eq(creatorUsers.email, email), eq(creatorUsers.creatorId, request.creatorId))).returning({ id: creatorUsers.id });
  return { ok: true, data: { revoked: rows.length } };
}

/** Accès donnés, sous la forme « e-mail|id du créateur », pour les afficher sur les demandes. */
export async function grantedAccessKeys(db: Db): Promise<Set<string>> {
  const rows = await db.select({ email: creatorUsers.email, creatorId: creatorUsers.creatorId }).from(creatorUsers)
    .where(sql`${creatorUsers.creatorId} is not null`).orderBy(desc(creatorUsers.accessGrantedAt));
  return new Set(rows.map(row => `${row.email}|${row.creatorId}`));
}

/** Supprime les liens expirés depuis plus d'un jour. */
export async function pruneSignInTokens(db: Db, now = new Date()): Promise<void> {
  await db.delete(creatorSignInTokens).where(sql`${creatorSignInTokens.expiresAt} < ${new Date(now.getTime() - 86_400_000)}`);
}
