// Codes ajoutés par le créateur depuis son Studio (ADR-0043). Créateur prouvé (un compte vérifié par la bio) :
// le code est publié tout de suite, « À tester ». Sinon il attend la relecture de l'admin (« En relecture »).
// L'origine « Donné par le créateur » le distingue dans l'admin.
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { codeLogs, codes, creatorAccounts, toolSuggestions, tools } from '@/db/schema';
import { isValidDay } from './code-expiry';
import { codeFormatError, normalizeCode } from './code-format';
import { findCatalogDuplicate, validUrl } from './codes-admin';
import { domainOf } from './podcast-codes';
import { CREATOR_SUGGESTION_EVIDENCE } from './code-origin';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

/** toolSlug : outil choisi dans la liste. Sinon toolName (et le site s'il le donne) : Merkod ajoutera l'outil. */
export type CreatorCodeInput = { toolSlug: string | null; toolName: string; toolDomain: string | null; code: string; discount: string; creatorLink: string | null; sourceUrl: string | null; expiresOn: string | null };

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const withScheme = (value: string) => (value && !/^https?:\/\//i.test(value) ? `https://${value}` : value);

/** Le formulaire « Ajouter une offre » du Studio : code, lien d'affiliation ou les deux. L'interrupteur « Liens d'affiliation » ne concerne que l'IA. */
export function parseCreatorCode(body: Record<string, unknown>): Parsed<CreatorCodeInput> {
  const toolSlug = text(body.toolSlug, 120) || null;
  const toolName = text(body.toolName, 120).replace(/\s+/g, ' ');
  if (!toolSlug && toolName.length < 2) return { ok: false, error: 'Écris le nom de l’outil.' };
  const rawSite = text(body.toolSite, 300);
  const toolDomain = rawSite ? domainOf(rawSite) : null;
  if (rawSite && (!toolDomain || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(toolDomain))) return { ok: false, error: 'Le site de l’outil doit être une adresse web valide (ex. notion.so).' };
  const code = normalizeCode(text(body.code, 120));
  const discount = text(body.discount, 240);
  const creatorLink = withScheme(text(body.creatorLink, 1000));
  const sourceUrl = withScheme(text(body.sourceUrl, 1000));
  if (!code && !creatorLink) return { ok: false, error: 'Indique ton code promo, ton lien d’affiliation, ou les deux.' };
  const codeError = code ? codeFormatError(code) : null;
  if (codeError) return { ok: false, error: codeError };
  if (!discount) return { ok: false, error: 'Indique ce que gagne la personne (ex. -20 %, 1 mois offert).' };
  if (creatorLink && !validUrl(creatorLink)) return { ok: false, error: 'Le lien de ton offre doit être une adresse web valide.' };
  if (sourceUrl && !validUrl(sourceUrl)) return { ok: false, error: 'Le lien de ta vidéo ou de ton post doit être une adresse web valide.' };
  const expiresOn = text(body.expiresOn, 10);
  if (expiresOn && !isValidDay(expiresOn)) return { ok: false, error: 'La date de fin doit être une date valide.' };
  return { ok: true, data: { toolSlug, toolName, toolDomain: toolDomain || null, code, discount, creatorLink: creatorLink || null, sourceUrl: sourceUrl || null, expiresOn: expiresOn || null } };
}

/** Un compte de sa page prouvé par la bio : ses codes sont publiés sans relecture. */
export async function isProvenCreator(db: Db, creatorId: string): Promise<boolean> {
  const [row] = await db.select({ id: creatorAccounts.id }).from(creatorAccounts)
    .where(and(eq(creatorAccounts.creatorId, creatorId), eq(creatorAccounts.claimStatus, 'verified'))).limit(1);
  return Boolean(row);
}

/** Le domaine d'un site d'outil en base (https://www.notion.so/fr → notion.so). */
const SITE_HOST = '^https?://(www\\.)?([^/:?#]+).*$';

/** L'outil choisi dans la liste, ou celui dont le nom (ou le site) correspond exactement à ce qu'il a écrit. */
async function findTool(db: Db, input: CreatorCodeInput) {
  const live = isNull(tools.archivedAt);
  if (input.toolSlug) return (await db.select({ id: tools.id }).from(tools).where(and(eq(tools.slug, input.toolSlug), live)).limit(1))[0] ?? null;
  const [byName] = await db.select({ id: tools.id }).from(tools).where(and(sql`lower(${tools.name}) = lower(${input.toolName})`, live)).limit(1);
  if (byName || !input.toolDomain) return byName ?? null;
  const [bySite] = await db.select({ id: tools.id }).from(tools)
    .where(and(sql`regexp_replace(lower(${tools.website}), ${SITE_HOST}, '\\2') = ${input.toolDomain}`, live)).limit(1);
  return bySite ?? null;
}

export async function addCreatorCode(db: Db, creator: { id: string; slug: string }, input: CreatorCodeInput, pageUrl: string): Promise<Parsed<{ id: string; status: 'to_test' | 'pending' | 'new_tool' }>> {
  const tool = await findTool(db, input);
  if (!tool && input.toolSlug) return { ok: false, error: 'Outil introuvable.' };
  if (!tool) {
    // Outil pas encore sur Merkod : l'offre attend dans « Outils à ajouter ». L'admin ajoute l'outil, l'offre part en relecture.
    const [suggested] = await db.insert(toolSuggestions).values({
      name: input.toolName, domain: input.toolDomain, code: input.code || null, link: input.creatorLink, discount: input.discount,
      evidence: CREATOR_SUGGESTION_EVIDENCE, sourceUrl: input.sourceUrl ?? pageUrl, sourceTitle: input.sourceUrl ? '' : 'Donné par le créateur sur Merkod', creatorId: creator.id,
    }).onConflictDoNothing().returning({ id: toolSuggestions.id });
    if (!suggested) return { ok: false, error: 'Cette offre est déjà proposée pour cet outil.' };
    return { ok: true, data: { id: suggested.id, status: 'new_tool' } };
  }
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
