// Comptes des créateurs sur les réseaux, gérés dans l'admin (page Créateurs). Voir ADR-0016.
// Une chaîne YouTube se relie avec son lien : l'API donne son ID stable, son nom et ses abonnés (1 unité de quota).
// Les autres réseaux n'ont pas d'API ouverte : l'admin saisit le pseudo, le lien et les abonnés.
import { asc, eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { CREATOR_PLATFORMS, creatorAccounts, creators, type CreatorAccountRow } from '@/db/schema';
import { validUrl } from './codes-admin';
import { accountLevelOf } from './creator-level';
import type { AdminCreatorAccount, CreatorPlatform } from './creator-accounts-display';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// ---------- YouTube ----------

export type ChannelRef = { by: 'id' | 'handle' | 'username'; value: string };

/** Lit un lien de chaîne YouTube, un @pseudo ou un ID de chaîne (UC…). null si ce n'est pas une chaîne. */
export function youtubeChannelRef(raw: string): ChannelRef | null {
  const input = raw.trim();
  if (/^UC[A-Za-z0-9_-]{22}$/.test(input)) return { by: 'id', value: input };
  if (/^@[\p{L}\p{N}._-]{3,100}$/u.test(input)) return { by: 'handle', value: input };
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, '');
  if (host !== 'youtube.com') return null;
  const [first, second] = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (!first) return null;
  if (first.startsWith('@') && /^@[\p{L}\p{N}._-]{3,100}$/u.test(first)) return { by: 'handle', value: first };
  if (first === 'channel' && second && /^UC[A-Za-z0-9_-]{22}$/.test(second)) return { by: 'id', value: second };
  if (first === 'user' && second && /^[A-Za-z0-9]{1,100}$/.test(second)) return { by: 'username', value: second };
  return null;
}

export type YoutubeChannel = { externalId: string; title: string; handle: string; url: string; subscribers: number | null };
export type ChannelReader = (ref: ChannelRef) => Promise<YoutubeChannel | null>;

// Lecture d'une chaîne par l'API officielle. null : chaîne introuvable. Lève une erreur si l'API ne répond pas.
export function youtubeChannelReader(apiKey: string | undefined, fetchFn: typeof fetch = fetch): ChannelReader | null {
  if (!apiKey) return null;
  return async ref => {
    const param = ref.by === 'id' ? 'id' : ref.by === 'handle' ? 'forHandle' : 'forUsername';
    const endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${param}=${encodeURIComponent(ref.value)}&key=${encodeURIComponent(apiKey)}`;
    const response = await fetchFn(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error(`YouTube API ${response.status}`);
    const body = await response.json() as { items?: { id?: string; snippet?: { title?: string; customUrl?: string }; statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } }[] };
    const item = body.items?.[0];
    if (!item?.id) return null;
    const handle = item.snippet?.customUrl || (ref.by === 'handle' ? ref.value : item.id);
    const count = Number(item.statistics?.subscriberCount);
    return {
      externalId: item.id,
      title: item.snippet?.title ?? '',
      handle: handle.slice(0, 120),
      url: handle.startsWith('@') ? `https://www.youtube.com/${handle}` : `https://www.youtube.com/channel/${item.id}`,
      subscribers: item.statistics?.hiddenSubscriberCount || !Number.isFinite(count) ? null : count,
    };
  };
}

// ---------- Lecture ----------

function toAdmin(row: CreatorAccountRow): AdminCreatorAccount {
  return {
    id: row.id, platform: row.platform, externalId: row.externalId, handle: row.handle, url: row.url,
    subscribers: row.subscribers, subscribersAt: row.subscribersAt?.toISOString() ?? null,
    platformVerified: row.platformVerified, adminCheckedAt: row.adminCheckedAt?.toISOString() ?? null,
    level: accountLevelOf(row),
  };
}

/** Tous les comptes, rangés par créateur. */
export async function accountsByCreator(db: Db): Promise<Map<string, AdminCreatorAccount[]>> {
  const rows = await db.select().from(creatorAccounts).orderBy(asc(creatorAccounts.createdAt));
  const byCreator = new Map<string, AdminCreatorAccount[]>();
  for (const row of rows) byCreator.set(row.creatorId, [...(byCreator.get(row.creatorId) ?? []), toAdmin(row)]);
  return byCreator;
}

// ---------- Écriture ----------

function isPlatform(value: unknown): value is CreatorPlatform {
  return (CREATOR_PLATFORMS as readonly unknown[]).includes(value);
}

function parseSubscribers(value: unknown): Parsed<number | null> {
  if (value === null || value === undefined || value === '') return { ok: true, data: null };
  const count = typeof value === 'number' ? value : Number(String(value).replace(/[\s .]/g, ''));
  if (!Number.isInteger(count) || count < 0 || count > 2_000_000_000) return { ok: false, error: 'Le nombre d’abonnés doit être un nombre entier.' };
  return { ok: true, data: count };
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if ((current as { code?: unknown }).code === '23505') return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function ownerOf(db: Db, platform: CreatorPlatform, externalId: string | null, handle: string): Promise<string | null> {
  const rows = await db.select({ name: creators.name, externalId: creatorAccounts.externalId, handle: creatorAccounts.handle })
    .from(creatorAccounts).innerJoin(creators, eq(creators.id, creatorAccounts.creatorId))
    .where(eq(creatorAccounts.platform, platform));
  const match = rows.find(row => (externalId && row.externalId === externalId) || row.handle.toLowerCase() === handle.toLowerCase());
  return match?.name ?? null;
}

export type AccountDeps = { readChannel: ChannelReader | null; now?: Date };

/** Relie un compte à un créateur. YouTube : lu par l'API. Autres réseaux : saisis à la main. */
export async function addCreatorAccount(db: Db, creatorId: string, body: Record<string, unknown>, deps: AccountDeps): Promise<Parsed<{ id: string }>> {
  const now = deps.now ?? new Date();
  const [creator] = await db.select({ id: creators.id }).from(creators).where(eq(creators.id, creatorId)).limit(1);
  if (!creator) return { ok: false, error: 'Créateur introuvable.' };
  if (!isPlatform(body.platform)) return { ok: false, error: 'Choisis un réseau.' };

  let values: typeof creatorAccounts.$inferInsert;
  if (body.platform === 'youtube') {
    const ref = youtubeChannelRef(text(body.channel, 300));
    if (!ref) return { ok: false, error: 'Colle le lien de la chaîne (youtube.com/@pseudo) ou son @pseudo.' };
    if (!deps.readChannel) return { ok: false, error: 'La clé YouTube (YOUTUBE_API_KEY) manque : la chaîne ne peut pas être lue.' };
    let channel: YoutubeChannel | null;
    try { channel = await deps.readChannel(ref); } catch { return { ok: false, error: 'YouTube ne répond pas. Réessaie dans un moment.' }; }
    if (!channel) return { ok: false, error: 'Aucune chaîne YouTube ne correspond à ce lien.' };
    values = {
      creatorId, platform: 'youtube', externalId: channel.externalId, handle: channel.handle, url: channel.url,
      subscribers: channel.subscribers, subscribersAt: now,
    };
  } else {
    const handle = text(body.handle, 120);
    const url = text(body.url, 500);
    if (!handle) return { ok: false, error: 'Indique le pseudo du compte.' };
    if (!validUrl(url)) return { ok: false, error: 'Le lien du compte doit commencer par https://.' };
    const subscribers = parseSubscribers(body.subscribers);
    if (!subscribers.ok) return subscribers;
    values = {
      creatorId, platform: body.platform, handle, url,
      subscribers: subscribers.data, subscribersAt: subscribers.data === null ? null : now,
    };
  }

  const owner = await ownerOf(db, values.platform, values.externalId ?? null, values.handle);
  if (owner) return { ok: false, error: `Ce compte est déjà relié à ${owner}.` };
  try {
    const [row] = await db.insert(creatorAccounts).values(values).returning({ id: creatorAccounts.id });
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: 'Ce compte est déjà relié à un créateur.' };
    throw error;
  }
}

/** Coche ou décoche le badge certifié et le contrôle, ou corrige les abonnés d'un compte saisi à la main. */
export async function updateCreatorAccount(db: Db, id: string, body: Record<string, unknown>, now: Date = new Date()): Promise<Parsed<{ id: string }>> {
  const [account] = await db.select().from(creatorAccounts).where(eq(creatorAccounts.id, id)).limit(1);
  if (!account) return { ok: false, error: 'Compte introuvable.' };
  const changes: Partial<typeof creatorAccounts.$inferInsert> = {};
  if (typeof body.platformVerified === 'boolean') changes.platformVerified = body.platformVerified;
  if (typeof body.adminChecked === 'boolean') changes.adminCheckedAt = body.adminChecked ? (account.adminCheckedAt ?? now) : null;
  if ('subscribers' in body) {
    if (account.platform === 'youtube') return { ok: false, error: 'Les abonnés YouTube se mettent à jour avec « Actualiser ».' };
    const subscribers = parseSubscribers(body.subscribers);
    if (!subscribers.ok) return subscribers;
    changes.subscribers = subscribers.data;
    changes.subscribersAt = subscribers.data === null ? null : now;
  }
  if (Object.keys(changes).length === 0) return { ok: false, error: 'Rien à changer.' };
  await db.update(creatorAccounts).set({ ...changes, updatedAt: now }).where(eq(creatorAccounts.id, id));
  return { ok: true, data: { id } };
}

/** Relit une chaîne YouTube : abonnés et pseudo à jour. */
export async function refreshCreatorAccount(db: Db, id: string, deps: AccountDeps): Promise<Parsed<{ id: string }>> {
  const now = deps.now ?? new Date();
  const [account] = await db.select().from(creatorAccounts).where(eq(creatorAccounts.id, id)).limit(1);
  if (!account) return { ok: false, error: 'Compte introuvable.' };
  if (account.platform !== 'youtube' || !account.externalId) return { ok: false, error: 'Seules les chaînes YouTube s’actualisent toutes seules.' };
  if (!deps.readChannel) return { ok: false, error: 'La clé YouTube (YOUTUBE_API_KEY) manque : la chaîne ne peut pas être lue.' };
  let channel: YoutubeChannel | null;
  try { channel = await deps.readChannel({ by: 'id', value: account.externalId }); } catch { return { ok: false, error: 'YouTube ne répond pas. Réessaie dans un moment.' }; }
  if (!channel) return { ok: false, error: 'Cette chaîne n’existe plus sur YouTube.' };
  try {
    await db.update(creatorAccounts).set({
      handle: channel.handle, url: channel.url, subscribers: channel.subscribers, subscribersAt: now, lastRecheckedAt: now, updatedAt: now,
    }).where(eq(creatorAccounts.id, id));
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: `Le pseudo ${channel.handle} est déjà relié à un autre créateur.` };
    throw error;
  }
  return { ok: true, data: { id } };
}

export async function deleteCreatorAccount(db: Db, id: string): Promise<boolean> {
  const rows = await db.delete(creatorAccounts).where(eq(creatorAccounts.id, id)).returning({ id: creatorAccounts.id });
  return rows.length > 0;
}
