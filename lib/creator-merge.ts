// Pages à relier (ADR-0044) : un créateur a ouvert son studio sur une page provisoire (« Passer cette étape », ADR-0043),
// alors qu'une vraie page à son nom existe déjà sur Merkod. Quand il prouve la vraie page par sa bio, la page provisoire
// y est fusionnée : ses codes, son compte et le reste passent sur la vraie page, puis la page provisoire disparaît.
import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { Db } from '@/db';
import { adminAuditLog, codes, creatorAccounts, creatorUsers, creators, toolSuggestions, watchedSources } from '@/db/schema';
import { fold, loadFindablePages, matchCreatorPages, type FoundPage } from './creator-studio';
import { linkInviteMail, type Mailer } from './creator-mail';
import { logAdminAction } from './site-settings';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export const LINK_INVITE_ACTION = 'creator_link_invite';

/** Une page est provisoire tant qu'aucun de ses comptes n'est prouvé par la bio. */
export async function isProvisionalPage(db: Db, creatorId: string): Promise<boolean> {
  const [row] = await db.select({ id: creatorAccounts.id }).from(creatorAccounts)
    .where(and(eq(creatorAccounts.creatorId, creatorId), eq(creatorAccounts.claimStatus, 'verified'))).limit(1);
  return !row;
}

/**
 * Fusionne la page provisoire `fromId` dans la vraie page `toId`. Pas de transaction (pilote Neon HTTP) :
 * tout est déplacé d'abord, la page provisoire s'efface en dernier, un nouvel essai reprend là où ça s'est arrêté.
 */
export async function mergeProvisionalPage(db: Db, fromId: string, toId: string, now = new Date()): Promise<Parsed<{ codes: number }>> {
  if (fromId === toId) return { ok: false, error: 'C’est déjà la même page.' };
  const [from] = await db.select().from(creators).where(eq(creators.id, fromId)).limit(1);
  const [to] = await db.select().from(creators).where(eq(creators.id, toId)).limit(1);
  if (!from || !to) return { ok: false, error: 'Page introuvable.' };
  if (!(await isProvisionalPage(db, fromId))) return { ok: false, error: 'Cette page est vérifiée : Merkod ne la fusionne pas.' };

  const moved = await db.update(codes).set({ creatorId: toId, updatedAt: now }).where(eq(codes.creatorId, fromId)).returning({ id: codes.id });
  await db.update(watchedSources).set({ creatorId: toId }).where(eq(watchedSources.creatorId, fromId));
  await db.update(toolSuggestions).set({ creatorId: toId }).where(eq(toolSuggestions.creatorId, fromId));
  // Ses comptes passent sur la vraie page (un compte n'appartient jamais qu'à une page : pas de doublon possible).
  await db.update(creatorAccounts).set({ creatorId: toId, updatedAt: now }).where(eq(creatorAccounts.creatorId, fromId));
  if (!to.bio && from.bio) await db.update(creators).set({ bio: from.bio, updatedAt: now }).where(eq(creators.id, toId));
  await db.update(creatorUsers).set({ creatorId: toId }).where(eq(creatorUsers.creatorId, fromId));
  await db.delete(creators).where(eq(creators.id, fromId));
  return { ok: true, data: { codes: moved.length } };
}

// ---------- Studio et admin : repérer la vraie page d'un créateur à la page provisoire ----------

/** La vraie page qui ressemble le plus au nom de la page provisoire : une autre page, avec au moins un compte relié. */
export function bestMatch(pages: FoundPage[], own: { slug: string; name: string }, provisional: Set<string>): FoundPage | null {
  const candidate = (page: FoundPage) => page.slug !== own.slug && !provisional.has(page.slug) && page.accounts.length > 0;
  const found = matchCreatorPages(pages, own.name, 8).find(candidate);
  if (found) return found;
  // L'inverse : « Nchang Belinga officiel » contient le nom ou le @ de la vraie page « Nchang Belinga ».
  const mine = fold(own.name);
  // La correspondance la plus longue gagne : « Nchang Belinga » plutôt que « Nchang B ».
  const length = (page: FoundPage) => Math.max(0, ...[page.name, ...page.accounts.map(account => account.handle)].map(fold)
    .filter(key => key.length >= 4 && mine.includes(key)).map(key => key.length));
  return pages.filter(candidate).map(page => ({ page, length: length(page) })).filter(item => item.length > 0)
    .sort((a, b) => b.length - a.length || b.page.codes - a.page.codes || a.page.name.localeCompare(b.page.name, 'fr'))[0]?.page ?? null;
}

export type PageToLink = {
  userId: string;
  email: string;
  page: { slug: string; name: string };
  match: FoundPage;
  invitedAt: string | null;
};

/** Les créateurs reliés à une page provisoire (aucun compte prouvé par la bio), comptes désactivés exclus. */
export async function provisionalUsers(db: Db): Promise<{ userId: string; email: string; creatorId: string; slug: string; name: string }[]> {
  const users = await db.select({ userId: creatorUsers.id, email: creatorUsers.email, creatorId: creators.id, slug: creators.slug, name: creators.name })
    .from(creatorUsers).innerJoin(creators, eq(creators.id, creatorUsers.creatorId))
    .where(and(isNotNull(creatorUsers.creatorId), isNull(creatorUsers.disabledAt)));
  if (!users.length) return [];
  const proven = await db.selectDistinct({ creatorId: creatorAccounts.creatorId }).from(creatorAccounts)
    .where(and(inArray(creatorAccounts.creatorId, users.map(user => user.creatorId)), eq(creatorAccounts.claimStatus, 'verified')));
  const provenIds = new Set(proven.map(row => row.creatorId));
  return users.filter(user => !provenIds.has(user.creatorId));
}

/** Pages à relier : chaque créateur à la page provisoire dont le nom ressemble à une vraie page avec des comptes. */
export async function listPagesToLink(db: Db): Promise<PageToLink[]> {
  const waiting = await provisionalUsers(db);
  if (!waiting.length) return [];
  const provisional = new Set(waiting.map(user => user.slug));
  const pages = await loadFindablePages(db);
  const invites = await db.select({ target: adminAuditLog.target, createdAt: adminAuditLog.createdAt }).from(adminAuditLog)
    .where(eq(adminAuditLog.action, LINK_INVITE_ACTION)).orderBy(desc(adminAuditLog.createdAt));
  const out: PageToLink[] = [];
  for (const user of waiting) {
    const match = bestMatch(pages, user, provisional);
    if (!match) continue;
    const invited = invites.find(row => row.target === inviteTarget(user.email, match.slug));
    out.push({ userId: user.userId, email: user.email, page: { slug: user.slug, name: user.name }, match, invitedAt: invited ? invited.createdAt.toISOString() : null });
  }
  return out.sort((a, b) => Number(Boolean(a.invitedAt)) - Number(Boolean(b.invitedAt)) || a.page.name.localeCompare(b.page.name, 'fr'));
}

/** Même forme que le reste du journal (« e-mail · page ») : l'effacement d'un compte y masque l'e-mail. */
export const inviteTarget = (email: string, slug: string) => `${email} · ${slug}`;

/** L'admin envoie l'invitation d'un clic. La page à relier est recalculée ici : on n'écrit qu'à un créateur encore à relier. */
export async function sendLinkInvite(db: Db, userId: string, mailer: Mailer, studioUrl: string, now = new Date()): Promise<Parsed<{ invitedAt: string }>> {
  const item = (await listPagesToLink(db)).find(row => row.userId === userId);
  if (!item) return { ok: false, error: 'Ce créateur n’a plus de page à relier.' };
  await mailer(linkInviteMail(item.email, item.page.name, item.match.name, `${studioUrl}#relier`, now));
  await logAdminAction(db, LINK_INVITE_ACTION, inviteTarget(item.email, item.match.slug));
  return { ok: true, data: { invitedAt: now.toISOString() } };
}
