// Photos des créateurs (et plus tard logos des outils) récupérées par Merkod et servies depuis Merkod (ADR-0027).
// La photo vient de la chaîne YouTube reliée au créateur : récupérée dès que la chaîne est reliée,
// ou quand l'admin clique « Actualiser la photo ». Les photos déjà dans le dépôt (npm run avatars) restent en secours.
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Db } from '@/db';
import { creatorAccounts, creators, storedImages, tools, STORED_IMAGE_TYPES } from '@/db/schema';
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

/** Enregistre (ou remplace) le logo d'un outil. */
export async function saveToolImage(db: Db, toolId: string, image: FetchedImage, now = new Date()): Promise<void> {
  const values = { mime: image.mime, data: image.data, bytes: image.bytes, sourceUrl: image.sourceUrl, fetchedAt: now };
  await db.insert(storedImages).values({ toolId, ...values })
    .onConflictDoUpdate({ target: storedImages.toolId, targetWhere: isNotNull(storedImages.toolId), set: values });
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

/** Adresse de la photo d'un créateur servie par Merkod, avec sa date pour que le navigateur reprenne la nouvelle. */
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

// ── Logos des outils ────────────────────────────────────────────────────────────────────────────

/** Domaine du site d'un outil, sans « www. ». null si l'adresse est invalide. */
export function toolDomain(website: string): string | null {
  try {
    const url = new URL(website);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.hostname.toLowerCase().replace(/^www\./, '') : null;
  } catch {
    return null;
  }
}

/**
 * Le logo d'un outil : Logo.dev d'abord (si LOGO_DEV_TOKEN est défini), sinon l'icône de son site (apple-touch-icon).
 * La clé Logo.dev n'est jamais enregistrée : l'adresse gardée est celle de la marque, sans la clé.
 */
export async function fetchToolLogo(website: string, options: { logoDevToken?: string; fetchFn?: typeof fetch } = {}): Promise<FetchedImage | null> {
  const domain = toolDomain(website);
  if (!domain) return null;
  if (options.logoDevToken) {
    const url = `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(options.logoDevToken)}&size=128&format=png&retina=true&fallback=404`;
    const image = await fetchImage(url, ['img.logo.dev'], options.fetchFn).catch(() => null);
    if (image) return { ...image, sourceUrl: `https://img.logo.dev/${domain}` };
  }
  for (const host of [domain, `www.${domain}`]) {
    const image = await fetchImage(`https://${host}/apple-touch-icon.png`, [host], options.fetchFn).catch(() => null);
    if (image) return image;
  }
  return null;
}

export type LogoReport = { updated: string[]; failed: { tool: string; reason: string }[]; remaining: number };

/**
 * Récupère le logo de chaque outil suivi (ou d'un seul). missingOnly : seulement ceux qui n'ont pas encore de logo en base.
 * limit : au plus ce nombre d'outils par appel (une requête Vercel dure 60 s au plus) ; remaining dit combien attendent encore.
 * skip : outils déjà tentés sans succès à passer (ils restent en tête de la liste des manquants, l'ordre étant stable).
 */
export async function refreshToolLogos(db: Db, options: { onlyToolId?: string; missingOnly?: boolean; limit?: number; skip?: number; logoDevToken?: string; fetchFn?: typeof fetch; now?: Date } = {}): Promise<LogoReport> {
  const conditions = [isNull(tools.archivedAt)];
  if (options.onlyToolId) conditions.push(eq(tools.id, options.onlyToolId));
  if (options.missingOnly) conditions.push(isNull(storedImages.id));
  const rows = await db.select({ id: tools.id, name: tools.name, website: tools.website })
    .from(tools).leftJoin(storedImages, eq(storedImages.toolId, tools.id)).where(and(...conditions)).orderBy(tools.priority, tools.name);
  const pending = rows.slice(options.skip ?? 0);
  const batch = options.limit ? pending.slice(0, options.limit) : pending;
  const report: LogoReport = { updated: [], failed: [], remaining: pending.length - batch.length };
  // Cinq outils à la fois : assez pour tenir dans le temps d'une requête, sans charger les sites des marques.
  for (let start = 0; start < batch.length; start += 5) {
    await Promise.all(batch.slice(start, start + 5).map(async tool => {
      const image = await fetchToolLogo(tool.website, options).catch(() => null);
      if (!image) { report.failed.push({ tool: tool.name, reason: 'Aucun logo trouvé sur Logo.dev ni sur son site.' }); return; }
      await saveToolImage(db, tool.id, image, options.now);
      report.updated.push(tool.name);
    }));
  }
  report.updated.sort((a, b) => a.localeCompare(b, 'fr'));
  report.failed.sort((a, b) => a.tool.localeCompare(b.tool, 'fr'));
  return report;
}

/** Adresse du logo d'un outil servi par Merkod. */
export function toolImageUrl(slug: string, mime: StoredImageType, fetchedAt: Date): string {
  return `/media/logos/${slug}.${EXTENSIONS[mime]}?v=${fetchedAt.getTime().toString(36)}`;
}

/** Logos en base de tous les outils, par slug. logoDev : au moins un vient de Logo.dev (lien d'attribution du pied de page). */
export async function loadLogoMap(db: Db): Promise<{ logos: Record<string, string>; logoDev: boolean }> {
  const rows = await db.select({ slug: tools.slug, mime: storedImages.mime, fetchedAt: storedImages.fetchedAt, sourceUrl: storedImages.sourceUrl })
    .from(storedImages).innerJoin(tools, eq(tools.id, storedImages.toolId));
  return {
    logos: Object.fromEntries(rows.map(row => [row.slug, toolImageUrl(row.slug, row.mime, row.fetchedAt)])),
    logoDev: rows.some(row => row.sourceUrl.startsWith('https://img.logo.dev/')),
  };
}

/** Le logo d'un outil pour la route /media/logos/<slug>.<ext>. */
export async function loadToolImage(db: Db, slug: string): Promise<{ mime: StoredImageType; body: Buffer } | null> {
  const [row] = await db.select({ mime: storedImages.mime, data: storedImages.data })
    .from(storedImages).innerJoin(tools, eq(tools.id, storedImages.toolId)).where(eq(tools.slug, slug)).limit(1);
  return row ? { mime: row.mime, body: Buffer.from(row.data, 'base64') } : null;
}

/** Outils suivis sans logo en base (pour le bouton de l'admin). */
export async function toolsWithoutImage(db: Db): Promise<number> {
  const rows = await db.select({ id: tools.id }).from(tools)
    .leftJoin(storedImages, eq(storedImages.toolId, tools.id)).where(and(isNull(tools.archivedAt), isNull(storedImages.id)));
  return rows.length;
}
