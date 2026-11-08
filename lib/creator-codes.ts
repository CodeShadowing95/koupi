// Codes ajoutés par le créateur depuis son Studio (ADR-0043). Créateur prouvé (un compte vérifié par la bio) :
// le code est publié tout de suite, « À tester ». Sinon il attend la relecture de l'admin (« En relecture »).
// L'origine « Donné par le créateur » le distingue dans l'admin.
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '@/db';
import { codeLogs, codes, creatorAccounts, tools } from '@/db/schema';
import { isValidDay } from './code-expiry';
import { codeFormatError, normalizeCode } from './code-format';
import { findCatalogDuplicate, validUrl } from './codes-admin';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type CreatorCodeInput = { toolSlug: string; code: string; discount: string; creatorLink: string | null; sourceUrl: string | null; expiresOn: string | null };

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const withScheme = (value: string) => (value && !/^https?:\/\//i.test(value) ? `https://${value}` : value);

/** Le formulaire « Ajouter un code » du Studio. */
export function parseCreatorCode(body: Record<string, unknown>): Parsed<CreatorCodeInput> {
  const toolSlug = text(body.toolSlug, 120);
  if (!toolSlug) return { ok: false, error: 'Choisis l’outil.' };
  const code = normalizeCode(text(body.code, 120));
  const discount = text(body.discount, 240);
  const creatorLink = withScheme(text(body.creatorLink, 1000));
  const sourceUrl = withScheme(text(body.sourceUrl, 1000));
  if (!code && !creatorLink) return { ok: false, error: 'Indique ton code, ou le lien de ton offre s’il n’y a pas de code.' };
  const codeError = code ? codeFormatError(code) : null;
  if (codeError) return { ok: false, error: codeError };
  if (!discount) return { ok: false, error: 'Indique ce que gagne la personne (ex. -20 %, 1 mois offert).' };
  if (creatorLink && !validUrl(creatorLink)) return { ok: false, error: 'Le lien de ton offre doit être une adresse web valide.' };
  if (sourceUrl && !validUrl(sourceUrl)) return { ok: false, error: 'Le lien de ta vidéo ou de ton post doit être une adresse web valide.' };
  const expiresOn = text(body.expiresOn, 10);
  if (expiresOn && !isValidDay(expiresOn)) return { ok: false, error: 'La date de fin doit être une date valide.' };
  return { ok: true, data: { toolSlug, code, discount, creatorLink: creatorLink || null, sourceUrl: sourceUrl || null, expiresOn: expiresOn || null } };
}

/** Un compte de sa page prouvé par la bio : ses codes sont publiés sans relecture. */
export async function isProvenCreator(db: Db, creatorId: string): Promise<boolean> {
  const [row] = await db.select({ id: creatorAccounts.id }).from(creatorAccounts)
    .where(and(eq(creatorAccounts.creatorId, creatorId), eq(creatorAccounts.claimStatus, 'verified'))).limit(1);
  return Boolean(row);
}

export async function addCreatorCode(db: Db, creator: { id: string; slug: string }, input: CreatorCodeInput, pageUrl: string): Promise<Parsed<{ id: string; status: 'to_test' | 'pending' }>> {
  const [tool] = await db.select({ id: tools.id }).from(tools).where(and(eq(tools.slug, input.toolSlug), isNull(tools.archivedAt))).limit(1);
  if (!tool) return { ok: false, error: 'Outil introuvable.' };
  const duplicate = await findCatalogDuplicate(db, tool.id, input.code, undefined, input.creatorLink);
  if (duplicate) return { ok: false, error: input.code ? `Le code ${input.code} est déjà sur Merkod pour cet outil.` : 'Cette offre est déjà sur Merkod pour cet outil.' };
  const status = (await isProvenCreator(db, creator.id)) ? 'to_test' : 'pending';
  const [created] = await db.insert(codes).values({
    toolId: tool.id, creatorId: creator.id, code: input.code || null, discount: input.discount, creatorLink: input.creatorLink,
    sourceUrl: input.sourceUrl ?? pageUrl, sourceTitle: input.sourceUrl ? '' : 'Donné par le créateur sur Merkod',
    status, expiresOn: input.expiresOn, origin: 'creator',
  }).returning({ id: codes.id });
  await db.insert(codeLogs).values({ codeId: created.id, action: 'create', nextStatus: status, note: 'Ajouté par le créateur depuis son Studio.' });
  return { ok: true, data: { id: created.id, status } };
}
