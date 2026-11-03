// Profil public d'un créateur : sa présentation, ses comptes sur les réseaux et ses thèmes.
// Le reste de sa page (ses codes) vient du catalogue (getCatalog).
import { asc, eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { creatorAccounts, creators } from '@/db/schema';
import { PLATFORM_LABELS, formatSubscribers, type CreatorPlatform } from './creator-accounts-display';
import type { Code, Tool } from './data';

export type PublicCreatorAccount = { platform: CreatorPlatform; label: string; handle: string; url: string; subscribers: string | null; proven: boolean };
export type CreatorProfile = { bio: string | null; accounts: PublicCreatorAccount[] };

const PLATFORM_ORDER: CreatorPlatform[] = ['youtube', 'tiktok', 'instagram', 'snapchat', 'twitch', 'x', 'podcast', 'other'];

/** Comptes rangés pour l'affichage : par réseau (YouTube d'abord), puis le plus suivi en premier. */
/** proven : le créateur a prouvé que ce compte est le sien (preuve par la bio, ADR-0020). */
export function publicAccounts(rows: { platform: CreatorPlatform; handle: string; url: string; subscribers: number | null; claimStatus?: string }[]): PublicCreatorAccount[] {
  return [...rows]
    .sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform) || (b.subscribers ?? -1) - (a.subscribers ?? -1))
    .map(row => ({ platform: row.platform, label: PLATFORM_LABELS[row.platform], handle: row.handle, url: row.url, subscribers: formatSubscribers(row.subscribers), proven: row.claimStatus === 'verified' }));
}

/** null si aucun créateur n'a cette adresse. */
export async function loadCreatorProfile(db: Db, slug: string): Promise<CreatorProfile | null> {
  const [creator] = await db.select({ id: creators.id, bio: creators.bio }).from(creators).where(eq(creators.slug, slug)).limit(1);
  if (!creator) return null;
  const rows = await db.select({ platform: creatorAccounts.platform, handle: creatorAccounts.handle, url: creatorAccounts.url, subscribers: creatorAccounts.subscribers, claimStatus: creatorAccounts.claimStatus })
    .from(creatorAccounts).where(eq(creatorAccounts.creatorId, creator.id)).orderBy(asc(creatorAccounts.createdAt));
  return { bio: creator.bio, accounts: publicAccounts(rows) };
}

/** Thèmes du créateur, déduits des outils de ses codes : la catégorie la plus fréquente d'abord. */
export function creatorCategories(codes: Pick<Code, 'toolSlug'>[], tools: Pick<Tool, 'slug' | 'category'>[]): string[] {
  const count = new Map<string, number>();
  for (const code of codes) {
    const category = tools.find(tool => tool.slug === code.toolSlug)?.category;
    if (category) count.set(category, (count.get(category) ?? 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')).map(([name]) => name);
}
