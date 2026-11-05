// Relie d'un coup les chaînes YouTube des créateurs déjà en base, à partir des vidéos sources de leurs codes.
// La chaîne qui a publié la vidéo est celle du créateur crédité : on la relie si toutes ses vidéos viennent
// de la même chaîne et que cette chaîne n'est pas déjà reliée à quelqu'un d'autre. Sinon on n'invente rien,
// on le signale. Le compte relié reste « non contrôlé » : le contrôle reste un geste de l'admin.
// Coût en quota YouTube : 1 unité par lot de 50 vidéos + 1 unité par lot de 50 chaînes.
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, creatorAccounts, creators } from '@/db/schema';
import { refreshCreatorAvatars } from './stored-images';
import { youtubeVideoId } from './verification-run';
import { youtubeFetch } from './api-usage';

const API = 'https://www.googleapis.com/youtube/v3';
const BATCH = 50;

/** thumbnail : adresse de la photo de profil de la chaîne (240 px), servie par Google. */
export type ChannelInfo = { id: string; handle: string; url: string; subscribers: number | null; thumbnail?: string };

export type YoutubeBatch = {
  /** Chaîne de chaque vidéo (vidéo absente : supprimée ou privée). */
  videoChannels(videoIds: string[]): Promise<Map<string, string>>;
  channels(channelIds: string[]): Promise<Map<string, ChannelInfo>>;
};

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Lecture par lots de l'API officielle. null sans clé.
export function youtubeBatch(apiKey: string | undefined, fetchFn: typeof fetch = youtubeFetch): YoutubeBatch | null {
  if (!apiKey) return null;
  const get = async <T>(endpoint: string, params: Record<string, string>): Promise<T> => {
    const query = new URLSearchParams({ ...params, key: apiKey });
    const response = await fetchFn(`${API}/${endpoint}?${query}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`YouTube API ${endpoint} ${response.status}`);
    return response.json() as Promise<T>;
  };
  return {
    async videoChannels(videoIds) {
      const found = new Map<string, string>();
      for (const ids of chunks([...new Set(videoIds)], BATCH)) {
        const body = await get<{ items?: { id?: string; snippet?: { channelId?: string } }[] }>('videos', { part: 'snippet', id: ids.join(','), maxResults: String(BATCH) });
        for (const item of body.items ?? []) if (item.id && item.snippet?.channelId) found.set(item.id, item.snippet.channelId);
      }
      return found;
    },
    async channels(channelIds) {
      const found = new Map<string, ChannelInfo>();
      for (const ids of chunks([...new Set(channelIds)], BATCH)) {
        const body = await get<{ items?: { id?: string; snippet?: { customUrl?: string; thumbnails?: Record<string, { url?: string }> }; statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } }[] }>('channels', { part: 'snippet,statistics', id: ids.join(','), maxResults: String(BATCH) });
        for (const item of body.items ?? []) {
          if (!item.id) continue;
          const handle = (item.snippet?.customUrl || item.id).slice(0, 120);
          const count = Number(item.statistics?.subscriberCount);
          found.set(item.id, {
            id: item.id,
            handle,
            url: handle.startsWith('@') ? `https://www.youtube.com/${handle}` : `https://www.youtube.com/channel/${item.id}`,
            subscribers: item.statistics?.hiddenSubscriberCount || !Number.isFinite(count) ? null : count,
            thumbnail: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url,
          });
        }
      }
      return found;
    },
  };
}

export type LinkSkip = { creator: string; reason: string };
export type LinkReport = { linked: string[]; skipped: LinkSkip[] };

/** Relie la chaîne YouTube de chaque créateur qui n'en a pas encore (ou d'un seul, avec onlyCreatorId). */
export async function linkYoutubeChannels(db: Db, youtube: YoutubeBatch, options: { onlyCreatorId?: string; now?: Date } = {}): Promise<LinkReport> {
  const now = options.now ?? new Date();
  const report: LinkReport = { linked: [], skipped: [] };
  const only = options.onlyCreatorId;
  const [creatorRows, codeRows, youtubeAccounts] = await Promise.all([
    db.select({ id: creators.id, name: creators.name }).from(creators).where(only ? eq(creators.id, only) : undefined),
    db.select({ creatorId: codes.creatorId, sourceUrl: codes.sourceUrl }).from(codes).where(only ? and(isNull(codes.archivedAt), eq(codes.creatorId, only)) : isNull(codes.archivedAt)),
    db.select({ creatorId: creatorAccounts.creatorId, externalId: creatorAccounts.externalId, handle: creatorAccounts.handle })
      .from(creatorAccounts).where(eq(creatorAccounts.platform, 'youtube')),
  ]);
  const hasChannel = new Set(youtubeAccounts.map(account => account.creatorId));
  const ownerOf = new Map(youtubeAccounts.filter(account => account.externalId).map(account => [account.externalId!, account.creatorId]));
  const takenHandles = new Set(youtubeAccounts.map(account => account.handle.toLowerCase()));
  const nameOf = new Map(creatorRows.map(row => [row.id, row.name]));

  // Vidéos YouTube de chaque créateur sans chaîne.
  const videosOf = new Map<string, string[]>();
  for (const row of codeRows) {
    if (hasChannel.has(row.creatorId)) continue;
    const id = youtubeVideoId(row.sourceUrl);
    if (id) videosOf.set(row.creatorId, [...(videosOf.get(row.creatorId) ?? []), id]);
  }
  // Un créateur sans vidéo YouTube n'est pas signalé ici : linkCreatorAccounts() (creator-account-link.ts) dit d'où viennent ses codes.
  if (videosOf.size === 0) return report;

  const channelOfVideo = await youtube.videoChannels([...videosOf.values()].flat());
  const channelOf = new Map<string, string>();
  for (const [creatorId, videos] of videosOf) {
    const found = new Set(videos.map(video => channelOfVideo.get(video)).filter((id): id is string => Boolean(id)));
    const name = nameOf.get(creatorId) ?? '';
    if (found.size === 0) report.skipped.push({ creator: name, reason: 'Ses vidéos sources ne sont plus en ligne.' });
    else if (found.size > 1) report.skipped.push({ creator: name, reason: `Ses vidéos viennent de ${found.size} chaînes différentes : relie la bonne à la main.` });
    else channelOf.set(creatorId, [...found][0]);
  }

  // Deux créateurs sur la même chaîne : c'est sans doute un doublon de nom, l'admin tranche.
  const creatorsByChannel = new Map<string, string[]>();
  for (const [creatorId, channelId] of channelOf) creatorsByChannel.set(channelId, [...(creatorsByChannel.get(channelId) ?? []), creatorId]);

  const infos = await youtube.channels([...new Set(channelOf.values())]);
  for (const [creatorId, channelId] of channelOf) {
    const name = nameOf.get(creatorId) ?? '';
    const owner = ownerOf.get(channelId);
    if (owner) { report.skipped.push({ creator: name, reason: `Sa chaîne est déjà reliée à ${nameOf.get(owner) ?? 'un autre créateur'}.` }); continue; }
    const sharing = creatorsByChannel.get(channelId) ?? [];
    if (sharing.length > 1) {
      const others = sharing.filter(id => id !== creatorId).map(id => nameOf.get(id)).join(', ');
      report.skipped.push({ creator: name, reason: `Même chaîne que ${others} : doublon de nom à corriger.` });
      continue;
    }
    const info = infos.get(channelId);
    if (!info) { report.skipped.push({ creator: name, reason: 'Sa chaîne n’a pas pu être lue.' }); continue; }
    if (takenHandles.has(info.handle.toLowerCase())) { report.skipped.push({ creator: name, reason: `Le pseudo ${info.handle} est déjà relié à un autre créateur.` }); continue; }
    const inserted = await db.insert(creatorAccounts).values({
      creatorId, platform: 'youtube', externalId: info.id, handle: info.handle, url: info.url,
      subscribers: info.subscribers, subscribersAt: now,
    }).onConflictDoNothing().returning({ id: creatorAccounts.id });
    if (inserted.length) { report.linked.push(name); takenHandles.add(info.handle.toLowerCase()); }
    else report.skipped.push({ creator: name, reason: 'Ce compte vient d’être relié ailleurs.' });
  }
  report.linked.sort((a, b) => a.localeCompare(b, 'fr'));
  report.skipped.sort((a, b) => a.creator.localeCompare(b.creator, 'fr'));
  return report;
}

/** Après l'ajout d'un code : relie la chaîne de son créateur s'il n'en a pas encore. Ne bloque jamais l'ajout. */
export async function linkChannelForCode(db: Db, codeId: string, youtube: YoutubeBatch | null): Promise<void> {
  if (!youtube) return;
  try {
    const [row] = await db.select({ creatorId: codes.creatorId }).from(codes).where(eq(codes.id, codeId)).limit(1);
    if (!row) return;
    await linkYoutubeChannels(db, youtube, { onlyCreatorId: row.creatorId });
    // Sa photo arrive avec sa chaîne : rien à lancer à la main.
    await refreshCreatorAvatars(db, { youtube }, { onlyCreatorId: row.creatorId, missingOnly: true });
  } catch (error) {
    console.error('youtube channel link failed', error);
  }
}

/** Créateurs qui n'ont pas encore de chaîne YouTube reliée (pour le bouton de l'admin). */
export async function creatorsWithoutChannel(db: Db): Promise<number> {
  const rows = await db.select({ id: creators.id }).from(creators)
    .leftJoin(creatorAccounts, and(eq(creatorAccounts.creatorId, creators.id), eq(creatorAccounts.platform, 'youtube')))
    .where(isNull(creatorAccounts.id));
  return rows.length;
}
