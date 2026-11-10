// Supprimer un créateur (ADR-0048) : quand un créateur demande à ne plus figurer sur Merkod, l'admin efface
// sa page et tout ce qui la concerne. Contrairement à l'archivage, rien n'est gardé : codes, historique des codes,
// liens d'offre, propositions liées, comptes reliés, chaînes suivies, photo, accès au studio.
// Le créateur entre dans la liste des créateurs retirés (ADR-0050). Les outils restent : ils appartiennent aux marques et d'autres créateurs peuvent y avoir des codes.
import { and, eq, inArray, or } from 'drizzle-orm';
import type { Db } from '@/db';
import {
  codeLogs, codes, creatorAccounts, creatorSignInTokens, creatorUsers, creators, submissions, toolSuggestions, verificationChecks, watchedSources,
} from '@/db/schema';
import { logAdminAction } from './site-settings';
import { rememberRemoval } from './removed-creators';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export const CREATOR_DELETE_ACTION = 'creator_delete';

/** Le nom tapé par l'admin pour confirmer : mêmes lettres, sans tenir compte des majuscules ni des espaces autour. */
export function confirmsCreatorName(typed: unknown, name: string): boolean {
  if (typeof typed !== 'string') return false;
  const clean = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');
  return clean(typed) !== '' && clean(typed) === clean(name);
}

/**
 * Efface le créateur `id` et tout ce qui le concerne. Pas de transaction (pilote Neon HTTP) : les lignes liées
 * s'effacent d'abord, le créateur en dernier, un nouvel essai reprend là où ça s'est arrêté.
 */
export async function deleteCreator(db: Db, id: string, confirmName: unknown): Promise<Parsed<{ name: string; codes: number }>> {
  const [creator] = await db.select({ id: creators.id, name: creators.name, slug: creators.slug }).from(creators).where(eq(creators.id, id)).limit(1);
  if (!creator) return { ok: false, error: 'Créateur introuvable.' };
  if (!confirmsCreatorName(confirmName, creator.name)) return { ok: false, error: 'Tape le nom exact du créateur pour confirmer.' };

  const own = await db.select({ id: codes.id, submissionId: codes.submissionId, importKey: codes.importKey }).from(codes).where(eq(codes.creatorId, id));
  const codeIds = own.map(code => code.id);
  const submissionIds = own.map(code => code.submissionId).filter((value): value is string => Boolean(value));

  // D'abord la liste des créateurs retirés (ADR-0050) : même si la suite échoue, Merkod ne le recrée plus tout seul.
  const channels = [
    ...(await db.select({ externalId: creatorAccounts.externalId }).from(creatorAccounts).where(and(eq(creatorAccounts.creatorId, id), eq(creatorAccounts.platform, 'youtube')))),
    ...(await db.select({ externalId: watchedSources.externalId }).from(watchedSources).where(and(eq(watchedSources.creatorId, id), eq(watchedSources.platform, 'youtube')))),
  ].map(row => row.externalId).filter((value): value is string => Boolean(value));
  await rememberRemoval(db, { name: creator.name, slug: creator.slug, channelIds: channels, importKeys: own.map(code => code.importKey).filter((value): value is string => Boolean(value)) });

  if (codeIds.length) {
    await db.delete(codeLogs).where(inArray(codeLogs.codeId, codeIds));
    await db.delete(verificationChecks).where(inArray(verificationChecks.codeId, codeIds));
  }
  // Codes trouvés à côté des siens (outils à ajouter) : ils viennent de ses vidéos ou de ses épisodes.
  await db.delete(toolSuggestions).where(codeIds.length
    ? or(eq(toolSuggestions.creatorId, id), inArray(toolSuggestions.codeId, codeIds))
    : eq(toolSuggestions.creatorId, id));
  if (codeIds.length) {
    await db.update(submissions).set({ createdCodeId: null }).where(inArray(submissions.createdCodeId, codeIds));
    await db.delete(codes).where(inArray(codes.id, codeIds));
  }
  // Les propositions des visiteurs qui ont donné ses codes (leurs vérifications partent avec, en cascade).
  if (submissionIds.length) await db.delete(submissions).where(inArray(submissions.id, submissionIds));

  // Chaînes et podcasts suivis pour lui : Merkod arrête de les lire.
  await db.delete(watchedSources).where(eq(watchedSources.creatorId, id));

  // Son accès au studio et ses liens de connexion (codes de preuve par la bio : en cascade).
  const users = await db.select({ email: creatorUsers.email }).from(creatorUsers).where(eq(creatorUsers.creatorId, id));
  if (users.length) {
    await db.delete(creatorSignInTokens).where(inArray(creatorSignInTokens.email, users.map(user => user.email)));
    await db.delete(creatorUsers).where(eq(creatorUsers.creatorId, id));
  }
  await db.delete(creatorSignInTokens).where(eq(creatorSignInTokens.creatorSlug, creator.slug));

  // Comptes reliés, demandes et photo : en cascade avec la page.
  await db.delete(creators).where(eq(creators.id, id));
  await logAdminAction(db, CREATOR_DELETE_ACTION, creator.name);
  return { ok: true, data: { name: creator.name, codes: codeIds.length } };
}
