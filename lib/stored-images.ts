// Photos des créateurs (et plus tard logos des outils) récupérées par Koupi et servies depuis Koupi (ADR-0027).
// La photo vient de la chaîne YouTube reliée au créateur : récupérée dès que la chaîne est reliée,
// ou quand l'admin clique « Actualiser la photo ». Les photos déjà dans le dépôt (npm run avatars) restent en secours.
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Db } from '@/db';
import { creatorAccounts, creators, storedImages, STORED_IMAGE_TYPES } from '@/db/schema';
import type { YoutubeBatch } from './creator-youtube-link';
import { creatorSlug } from './ui';

export type StoredImageType = typeof STORED_IMAGE_TYPES[number];
export type FetchedImage = { mime: StoredImageType; data: string; bytes: number; sourceUrl: string };

/** 150 Ko au plus : une photo de profil de 240 px pèse 10 à 30 Ko. */
export const MAX_IMAGE_BYTES = 150 * 1024;
const EXTENSIONS: Record<StoredImageType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
/** Les photos de chaînes YouTube sont servies par ces domaines de Google. */
export const YOUTUBE_IMAGE_HOSTS = ['ggpht.com', 'googleusercontent.com', 'ytimg.com'];

function hostAllowed(url: string, hosts: string[]): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === 'https:' && hosts.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

/** Télécharge une image d'un domaine autorisé, en vérifiant son type et sa taille. null si elle ne convient pas. */
export async function fetchImage(url: string, hosts: string[], fetchFn: typeof fetch = fetch): Promise<FetchedImage | null> {
  if (!hostAllowed(url, hosts)) return null;
  const response = await fetchFn(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const mime = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!(STORED_IMAGE_TYPES as readonly string[]).includes(mime)) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;
  return { mime: mime as StoredImageType, data: buffer.toString('base64'), bytes: buffer.length, sourceUrl: url };
}

/** Enregistre (ou remplace) la photo d'un créateur. */
export async function saveCreatorImage(db: Db, creatorId: string, image: FetchedImage, now = new Date()): Promise<void> {
  const values = { mime: image.mime, data: image.data, bytes: image.bytes, sourceUrl: image.sourceUrl, fetchedAt: now };
  await db.insert(storedImages).values({ creatorId, ...values })
    .onConflictDoUpdate({ target: storedImages.creatorId, targetWhere: isNotNull(storedImages.creatorId), set: values });
}

export type AvatarReport = { updated: string[]; failed: { creator: string; reason: string }[] };

/**
 * Récupère la photo de la chaîne YouTube reliée de chaque créateur (ou d'un seul).
 * missingOnly : seulement ceux qui n'ont pas encore de photo en base. Coût : 1 unité de quota par lot de 50 chaînes.
 */
export async function refreshCreatorAvatars(db: Db, youtube: Pick<YoutubeBatch, 'channels'>, options: { onlyCreatorId?: string; missingOnly?: boolean; fetchFn?: typeof fetch; now?: Date } = {}): Promise<AvatarReport> {
  const report: AvatarReport = { updated: [], failed: [] };
  const conditions = [eq(creatorAccounts.platform, 'youtube'), isNotNull(creatorAccounts.externalId)];
  if (options.onlyCreatorId) conditions.push(eq(creatorAccounts.creatorId, options.onlyCreatorId));
  if (options.missingOnly) conditions.push(isNull(storedImages.id));
  const rows = await db.select({ creatorId: creatorAccounts.creatorId, channelId: creatorAccounts.externalId, name: creators.name })
    .from(creatorAccounts)
    .innerJoin(creators, eq(creators.id, creatorAccounts.creatorId))
    .leftJoin(storedImages, eq(storedImages.creatorId, creatorAccounts.creatorId))
    .where(and(...conditions));
  // Un créateur peut avoir deux chaînes : la première suffit pour sa photo.
  const byCreator = new Map<string, { channelId: string; name: string }>();
  for (const row of rows) if (row.channelId && !byCreator.has(row.creatorId)) byCreator.set(row.creatorId, { channelId: row.channelId, name: row.name });
  if (byCreator.size === 0) return report;

  const infos = await youtube.channels([...byCreator.values()].map(item => item.channelId));
  for (const [creatorId, { channelId, name }] of byCreator) {
    const thumbnail = infos.get(channelId)?.thumbnail;
    if (!thumbnail) { report.failed.push({ creator: name, reason: 'Sa chaîne n’a pas de photo lisible.' }); continue; }
    try {
      const image = await fetchImage(thumbnail, YOUTUBE_IMAGE_HOSTS, options.fetchFn);
      if (!image) { report.failed.push({ creator: name, reason: 'La photo n’a pas pu être téléchargée.' }); continue; }
      await saveCreatorImage(db, creatorId, image, options.now);
      report.updated.push(name);
    } catch {
      report.failed.push({ creator: name, reason: 'La photo n’a pas pu être téléchargée.' });
    }
  }
  report.updated.sort((a, b) => a.localeCompare(b, 'fr'));
  return report;
}

/** Adresse de la photo d'un créateur servie par Koupi, avec sa date pour que le navigateur reprenne la nouvelle. */
export function creatorImageUrl(slug: string, mime: StoredImageType, fetchedAt: Date): string {
  return `/media/avatars/${slug}.${EXTENSIONS[mime]}?v=${fetchedAt.getTime().toString(36)}`;
}

/** Photos en base de tous les créateurs, par nom (même clé que lib/creator-avatars.json). */
export async function loadAvatarMap(db: Db): Promise<Record<string, string>> {
  const rows = await db.select({ name: creators.name, slug: creators.slug, mime: storedImages.mime, fetchedAt: storedImages.fetchedAt })
    .from(storedImages).innerJoin(creators, eq(creators.id, storedImages.creatorId));
  return Object.fromEntries(rows.map(row => [creatorSlug(row.name), creatorImageUrl(row.slug, row.mime, row.fetchedAt)]));
}

/** L'image d'un créateur pour la route /media/avatars/<slug>.<ext>. */
export async function loadCreatorImage(db: Db, slug: string): Promise<{ mime: StoredImageType; body: Buffer } | null> {
  const [row] = await db.select({ mime: storedImages.mime, data: storedImages.data })
    .from(storedImages).innerJoin(creators, eq(creators.id, storedImages.creatorId)).where(eq(creators.slug, slug)).limit(1);
  return row ? { mime: row.mime, body: Buffer.from(row.data, 'base64') } : null;
}

/** Créateurs qui ont une chaîne YouTube reliée mais pas encore de photo en base (pour le bouton de l'admin). */
export async function creatorsWithoutImage(db: Db): Promise<number> {
  const rows = await db.selectDistinct({ id: creatorAccounts.creatorId }).from(creatorAccounts)
    .leftJoin(storedImages, eq(storedImages.creatorId, creatorAccounts.creatorId))
    .where(and(eq(creatorAccounts.platform, 'youtube'), isNotNull(creatorAccounts.externalId), isNull(storedImages.id)));
  return rows.length;
}
