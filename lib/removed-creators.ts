// Créateurs retirés à leur demande (ADR-0050). Le bouton « Supprimer » d'une fiche créateur (ADR-0048) l'ajoute ici ;
// ensuite, aucune source automatique (chaînes, podcasts, recherche YouTube, compilations, imports de data/) ni l'admin
// ne peut recréer sa page. Lui reste libre de s'inscrire : quand il prouve sa chaîne par la bio, il sort de la liste.
import { desc, eq, or, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { creators, removedCreators } from '@/db/schema';
import { slugify } from './slug';
import { logAdminAction } from './site-settings';

export const REMOVED_CREATOR_ERROR = 'Ce créateur a demandé à ne plus figurer sur Merkod : il est dans la liste des créateurs retirés (Administration).';
export const CREATOR_UNREMOVE_ACTION = 'creator_unremove';
export const CREATOR_REMOVE_ACTION = 'creator_remove';

export type RemovedCreator = { id: string; name: string; slug: string; channels: number; removedAt: string };
export type RemovedSet = { slugs: Set<string>; channels: Set<string>; importKeys: Set<string> };

/** Ajoute le créateur à la liste (ou complète sa ligne s'il y est déjà). */
export async function rememberRemoval(db: Db, input: { name: string; slug: string; channelIds: string[]; importKeys: string[] }, now = new Date()): Promise<void> {
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
  const [current] = await db.select().from(removedCreators).where(eq(removedCreators.slug, input.slug)).limit(1);
  const channelIds = unique([...(current?.channelIds ?? []), ...input.channelIds]);
  const importKeys = unique([...(current?.importKeys ?? []), ...input.importKeys]);
  await db.insert(removedCreators).values({ name: input.name.slice(0, 160), slug: input.slug, channelIds, importKeys, removedAt: now })
    .onConflictDoUpdate({ target: removedCreators.slug, set: { channelIds, importKeys, removedAt: now } });
}

/** Toute la liste, pour un traitement en lot (import des fichiers de data/). */
export async function loadRemovedSet(db: Db): Promise<RemovedSet> {
  const rows = await db.select().from(removedCreators);
  return {
    slugs: new Set(rows.map(row => row.slug)),
    channels: new Set(rows.flatMap(row => row.channelIds)),
    importKeys: new Set(rows.flatMap(row => row.importKeys)),
  };
}

/** Ce nom (écrit autrement compris : « La Micro by Flo », « lamicrobyflo ») ou cette chaîne YouTube est-il retiré ? */
export async function isRemovedCreator(db: Db, who: { name?: string | null; channelId?: string | null }): Promise<boolean> {
  const slug = who.name ? slugify(who.name) : '';
  const conditions = [
    ...(slug ? [eq(removedCreators.slug, slug), sql`replace(${removedCreators.slug}, '-', '') = ${slug.replace(/-/g, '')}`] : []),
    ...(who.channelId ? [sql`${removedCreators.channelIds} @> ${JSON.stringify([who.channelId])}::jsonb`] : []),
  ];
  if (!conditions.length) return false;
  const [row] = await db.select({ id: removedCreators.id }).from(removedCreators).where(or(...conditions)).limit(1);
  return Boolean(row);
}

/** Le créateur a prouvé sa chaîne (ou sa page porte son nom) : il a donné son accord, il sort de la liste. */
export async function liftRemoval(db: Db, who: { slug?: string | null; channelId?: string | null }): Promise<number> {
  const conditions = [
    ...(who.slug ? [eq(removedCreators.slug, who.slug)] : []),
    ...(who.channelId ? [sql`${removedCreators.channelIds} @> ${JSON.stringify([who.channelId])}::jsonb`] : []),
  ];
  if (!conditions.length) return 0;
  const removed = await db.delete(removedCreators).where(or(...conditions)).returning({ id: removedCreators.id });
  return removed.length;
}

export async function listRemovedCreators(db: Db): Promise<RemovedCreator[]> {
  const rows = await db.select().from(removedCreators).orderBy(desc(removedCreators.removedAt));
  return rows.map(row => ({ id: row.id, name: row.name, slug: row.slug, channels: row.channelIds.length, removedAt: row.removedAt.toISOString() }));
}

/** L'admin sort le créateur de la liste (il a écrit qu'il veut revenir). */
export async function unremoveCreator(db: Db, id: string): Promise<boolean> {
  const [row] = await db.delete(removedCreators).where(eq(removedCreators.id, id)).returning({ name: removedCreators.name });
  if (!row) return false;
  await logAdminAction(db, CREATOR_UNREMOVE_ACTION, row.name);
  return true;
}

/** Un compte vient d'être prouvé par la bio : sa chaîne et le nom de sa page sortent de la liste. */
export async function liftRemovalForAccount(db: Db, account: { creatorId: string; platform: string; externalId: string | null }): Promise<number> {
  const [page] = await db.select({ slug: creators.slug }).from(creators).where(eq(creators.id, account.creatorId)).limit(1);
  return liftRemoval(db, { slug: page?.slug ?? null, channelId: account.platform === 'youtube' ? account.externalId : null });
}

/** L'admin ajoute à la main un créateur déjà effacé (ou jamais créé) qui a demandé à ne pas figurer sur Merkod. */
export async function addRemovedCreator(db: Db, rawName: unknown, rawChannel: unknown, now = new Date()): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = typeof rawName === 'string' ? rawName.trim().replace(/\s+/g, ' ') : '';
  const slug = slugify(name);
  if (!slug || name.length > 160) return { ok: false, error: 'Écris le nom du créateur (160 caractères au plus).' };
  const channel = typeof rawChannel === 'string' ? rawChannel.trim() : '';
  if (channel && !/^UC[A-Za-z0-9_-]{22}$/.test(channel)) return { ok: false, error: 'L’identifiant de chaîne commence par « UC » et compte 24 caractères (laisse vide si tu ne l’as pas).' };
  await rememberRemoval(db, { name, slug, channelIds: channel ? [channel] : [], importKeys: [] }, now);
  await logAdminAction(db, CREATOR_REMOVE_ACTION, name);
  return { ok: true };
}
