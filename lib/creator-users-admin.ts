// Comptes créateurs dans l'espace Administration (ADR-0022) : les lister, les désactiver ou les réactiver,
// leur retirer l'accès à leur page, les supprimer. Chaque geste est noté dans le journal.
// Rien ici ne regarde ce que font les créateurs : seulement l'e-mail, la page reliée et la dernière connexion.
import { and, asc, eq, or, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { adminAuditLog, creatorRequests, creatorSignInTokens, creatorUsers, creators } from '@/db/schema';
import { UUID_PATTERN } from './admin-guard';
import { logAdminAction } from './site-settings';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type CreatorUserItem = {
  id: string;
  email: string;
  creator: { slug: string; name: string } | null;
  lastSignInAt: string | null;
  disabledAt: string | null;
  createdAt: string;
};

export async function listCreatorUsers(db: Db): Promise<CreatorUserItem[]> {
  const rows = await db.select({
    id: creatorUsers.id, email: creatorUsers.email, slug: creators.slug, name: creators.name,
    lastSignInAt: creatorUsers.lastSignInAt, disabledAt: creatorUsers.disabledAt, createdAt: creatorUsers.createdAt,
  }).from(creatorUsers).leftJoin(creators, eq(creators.id, creatorUsers.creatorId)).orderBy(asc(creatorUsers.email));
  return rows.map(row => ({
    id: row.id, email: row.email,
    creator: row.slug && row.name ? { slug: row.slug, name: row.name } : null,
    lastSignInAt: row.lastSignInAt?.toISOString() ?? null,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** « a•••@exemple.fr » : ce qui reste d'un e-mail dans le journal une fois le compte supprimé. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '•••';
  return `${email[0]}•••${email.slice(at)}`;
}

export const CREATOR_USER_ACTIONS = ['disable', 'enable', 'remove-access', 'delete'] as const;
export type CreatorUserAction = (typeof CREATOR_USER_ACTIONS)[number];

export function parseCreatorUserAction(body: Record<string, unknown>): Parsed<{ id: string; action: CreatorUserAction }> {
  if (typeof body.id !== 'string' || !UUID_PATTERN.test(body.id)) return { ok: false, error: 'Compte inconnu.' };
  if (!(CREATOR_USER_ACTIONS as readonly unknown[]).includes(body.action)) return { ok: false, error: 'Action inconnue.' };
  return { ok: true, data: { id: body.id, action: body.action as CreatorUserAction } };
}

/** Applique un geste de l'admin sur un compte créateur et le note dans le journal. */
export async function applyCreatorUserAction(db: Db, id: string, action: CreatorUserAction, now = new Date()): Promise<Parsed<{ action: CreatorUserAction }>> {
  const [user] = await db.select().from(creatorUsers).where(eq(creatorUsers.id, id)).limit(1);
  if (!user) return { ok: false, error: 'Ce compte n’existe plus.' };

  if (action === 'disable') {
    if (user.disabledAt) return { ok: false, error: 'Ce compte est déjà désactivé.' };
    await db.update(creatorUsers).set({ disabledAt: now }).where(eq(creatorUsers.id, id));
    // Les liens de connexion déjà envoyés ne doivent plus servir.
    await db.delete(creatorSignInTokens).where(eq(creatorSignInTokens.email, user.email));
    await logAdminAction(db, 'creator_disabled', user.email);
  } else if (action === 'enable') {
    if (!user.disabledAt) return { ok: false, error: 'Ce compte est déjà actif.' };
    await db.update(creatorUsers).set({ disabledAt: null }).where(eq(creatorUsers.id, id));
    await logAdminAction(db, 'creator_enabled', user.email);
  } else if (action === 'remove-access') {
    if (!user.creatorId) return { ok: false, error: 'Ce compte n’a accès à aucune page.' };
    const [creator] = await db.select({ name: creators.name }).from(creators).where(eq(creators.id, user.creatorId)).limit(1);
    await db.update(creatorUsers).set({ creatorId: null, accessGrantedAt: null }).where(eq(creatorUsers.id, id));
    await logAdminAction(db, 'creator_access_removed', `${user.email} · ${creator?.name ?? 'page supprimée'}`);
  } else {
    // Effacement complet de la personne (aussi la réponse à une demande d'effacement RGPD). La page publique
    // du créateur et ses codes restent : ils viennent de ses vidéos publiques, pas de son compte.
    // Pas de transaction (pilote Neon HTTP) : le compte s'efface en dernier, un nouvel essai reprend là où ça s'est arrêté.
    const masked = maskEmail(user.email);
    await db.delete(creatorSignInTokens).where(eq(creatorSignInTokens.email, user.email));
    await db.delete(creatorRequests).where(and(eq(creatorRequests.kind, 'claim'), eq(creatorRequests.email, user.email)));
    await db.update(creatorRequests).set({ email: null }).where(eq(creatorRequests.email, user.email));
    await db.update(adminAuditLog)
      .set({ target: sql`${masked} || substr(${adminAuditLog.target}, ${user.email.length + 1})` })
      .where(or(eq(adminAuditLog.target, user.email), sql`starts_with(${adminAuditLog.target}, ${`${user.email} · `})`));
    await db.delete(creatorUsers).where(eq(creatorUsers.id, id));
    await logAdminAction(db, 'creator_deleted', masked);
  }
  return { ok: true, data: { action } };
}
