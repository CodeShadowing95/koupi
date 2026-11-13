// Bouton « Relier les comptes » de l'admin : relie d'un coup les comptes des créateurs à partir des sources de leurs codes.
// - vidéo YouTube : la chaîne qui l'a publiée (voir creator-youtube-link.ts) ;
// - épisode Apple Podcasts : le podcast de l'épisode (identifiant dans le lien, titre lu dans l'annuaire Apple).
// Pour les créateurs qui restent sans aucun compte, on dit d'où viennent leurs codes (Instagram, Spotify, aucun code…)
// pour que l'admin sache quoi relier à la main. Un créateur qui a déjà un compte n'est pas signalé.
import { eq, isNull, ne } from 'drizzle-orm';
import type { Db } from '@/db';
import { codes, creatorAccounts, creators } from '@/db/schema';
import type { PodcastDirectory } from './apple-podcasts';
import { PLATFORM_LABELS, type CreatorPlatform, type LinkReport } from './creator-accounts-display';
import { linkYoutubeChannels, type YoutubeBatch } from './creator-youtube-link';
import { applePodcastUrl } from './podcasts-admin';
import { sourcePlatform } from './source-platform';
import { youtubeVideoId } from './verification-run';
import { MERKOD_FOUND_SLUG } from './merkod-found';

export type AccountsReport = LinkReport;

/** Identifiant du podcast dans un lien Apple Podcasts (…/id123 ou …/id123?i=456), null pour un autre lien. */
export function applePodcastId(url: string): number | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'podcasts.apple.com') return null;
    const id = Number(parsed.pathname.match(/\/id(\d+)\/?$/)?.[1]);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

type Sources = { youtube: boolean; applePodcast: boolean; platforms: Set<CreatorPlatform> };

function sourcesOf(urls: string[]): Sources {
  const platforms = new Set<CreatorPlatform>();
  for (const url of urls) {
    const platform = sourcePlatform(url);
    if (platform) platforms.add(platform);
  }
  return { youtube: urls.some(url => youtubeVideoId(url) !== null), applePodcast: urls.some(url => applePodcastId(url) !== null), platforms };
}

/** Pourquoi un créateur sans aucun compte n'a pas pu être relié, d'après les sources de ses codes. */
export function manualReason(urls: string[], youtubeReady: boolean): string {
  if (urls.length === 0) return 'Aucun code pour l’instant : relie ses comptes à la main si tu les connais.';
  const { youtube, platforms } = sourcesOf(urls);
  if (youtube && !youtubeReady) return 'Ses codes viennent de YouTube, mais la clé YouTube manque : sa chaîne n’a pas pu être lue.';
  const networks = [...platforms].filter(platform => platform !== 'youtube' && platform !== 'podcast' && platform !== 'other');
  if (networks.length) return `Ses codes viennent de ${networks.map(platform => PLATFORM_LABELS[platform]).join(', ')} : relie son compte à la main.`;
  if (platforms.has('podcast')) return 'Ses codes viennent d’un podcast hors Apple Podcasts (Spotify, flux RSS…) : relie-le à la main.';
  if (platforms.has('other')) return 'Ses codes viennent d’un site web : relie ses comptes à la main.';
  return 'Ses sources n’ont pas d’adresse lisible : relie ses comptes à la main.';
}

/** Relie le podcast des créateurs qui n'en ont pas, à partir de leurs épisodes Apple Podcasts. */
async function linkPodcasts(db: Db, directory: PodcastDirectory, sourcesByCreator: Map<string, string[]>, nameOf: Map<string, string>, report: AccountsReport): Promise<void> {
  const podcastAccounts = await db.select({ creatorId: creatorAccounts.creatorId, externalId: creatorAccounts.externalId, handle: creatorAccounts.handle })
    .from(creatorAccounts).where(eq(creatorAccounts.platform, 'podcast'));
  const hasPodcast = new Set(podcastAccounts.map(account => account.creatorId));
  const ownerOf = new Map(podcastAccounts.filter(account => account.externalId).map(account => [account.externalId!, account.creatorId]));
  const takenHandles = new Set(podcastAccounts.map(account => account.handle.toLowerCase()));

  const podcastOf = new Map<string, number>();
  for (const [creatorId, urls] of sourcesByCreator) {
    if (hasPodcast.has(creatorId)) continue;
    const ids = new Set(urls.map(applePodcastId).filter((id): id is number => id !== null));
    if (ids.size === 1) podcastOf.set(creatorId, [...ids][0]);
    else if (ids.size > 1) report.toLink.push({ creator: nameOf.get(creatorId) ?? '', reason: `Ses épisodes viennent de ${ids.size} podcasts différents : relie le bon à la main.` });
  }
  if (podcastOf.size === 0) return;

  let titles = new Map<number, { title: string; link: string; episodeCount: number }>();
  try {
    const feeds = await directory.podcasts([...new Set(podcastOf.values())]);
    titles = new Map(feeds.map(feed => [feed.id, { title: feed.title, link: feed.link, episodeCount: feed.episodeCount }]));
  } catch (error) {
    console.error('apple podcasts lookup failed', error);
  }

  for (const [creatorId, podcastId] of podcastOf) {
    const name = nameOf.get(creatorId) ?? '';
    const owner = ownerOf.get(String(podcastId));
    if (owner) { report.toLink.push({ creator: name, reason: `Son podcast est déjà relié à ${nameOf.get(owner) ?? 'un autre créateur'}.` }); continue; }
    const feed = titles.get(podcastId);
    const handle = (feed?.title || name).slice(0, 120);
    if (takenHandles.has(handle.toLowerCase())) { report.toLink.push({ creator: name, reason: `Le podcast « ${handle} » est déjà relié à un autre créateur.` }); continue; }
    const inserted = await db.insert(creatorAccounts).values({
      creatorId, platform: 'podcast', externalId: String(podcastId), handle, url: feed?.link || applePodcastUrl(podcastId),
      ...(feed && feed.episodeCount > 0 ? { metrics: { episodes: feed.episodeCount }, metricsAt: new Date() } : {}),
    }).onConflictDoNothing().returning({ id: creatorAccounts.id });
    if (inserted.length) { report.linked.push({ creator: name, platform: 'podcast' }); takenHandles.add(handle.toLowerCase()); ownerOf.set(String(podcastId), creatorId); }
  }
}

/** Relie les chaînes YouTube et les podcasts trouvables, puis liste les créateurs encore sans aucun compte. */
export async function linkCreatorAccounts(db: Db, deps: { youtube: YoutubeBatch | null; podcasts: PodcastDirectory }): Promise<AccountsReport> {
  const report: AccountsReport = { linked: [], toLink: [] };
  if (deps.youtube) {
    const youtube = await linkYoutubeChannels(db, deps.youtube);
    report.linked.push(...youtube.linked.map(creator => ({ creator, platform: 'youtube' as const })));
    report.toLink.push(...youtube.skipped);
  }

  const [creatorRows, codeRows] = await Promise.all([
    db.select({ id: creators.id, name: creators.name }).from(creators).where(ne(creators.slug, MERKOD_FOUND_SLUG)),
    db.select({ creatorId: codes.creatorId, sourceUrl: codes.sourceUrl }).from(codes).where(isNull(codes.archivedAt)),
  ]);
  const nameOf = new Map(creatorRows.map(row => [row.id, row.name]));
  const sourcesByCreator = new Map<string, string[]>();
  for (const row of codeRows) if (row.sourceUrl) sourcesByCreator.set(row.creatorId, [...(sourcesByCreator.get(row.creatorId) ?? []), row.sourceUrl]);

  await linkPodcasts(db, deps.podcasts, sourcesByCreator, nameOf, report);

  // Les créateurs encore sans aucun compte : on dit d'où viennent leurs codes.
  const withAccount = new Set((await db.selectDistinct({ creatorId: creatorAccounts.creatorId }).from(creatorAccounts)).map(row => row.creatorId));
  const reported = new Set(report.toLink.map(item => item.creator));
  for (const creator of creatorRows) {
    if (withAccount.has(creator.id) || reported.has(creator.name)) continue;
    report.toLink.push({ creator: creator.name, reason: manualReason(sourcesByCreator.get(creator.id) ?? [], deps.youtube !== null) });
  }
  report.linked.sort((a, b) => a.creator.localeCompare(b.creator, 'fr'));
  report.toLink.sort((a, b) => a.creator.localeCompare(b.creator, 'fr'));
  return report;
}

/**
 * Créateurs que le bouton concerne : ceux qui n'ont aucun compte, et ceux dont une source permettrait de relier
 * un compte qui leur manque (vidéo YouTube sans chaîne reliée, épisode Apple Podcasts sans podcast relié).
 */
export async function creatorsToLink(db: Db): Promise<number> {
  const [creatorRows, codeRows, accountRows] = await Promise.all([
    db.select({ id: creators.id }).from(creators).where(ne(creators.slug, MERKOD_FOUND_SLUG)),
    db.select({ creatorId: codes.creatorId, sourceUrl: codes.sourceUrl }).from(codes).where(isNull(codes.archivedAt)),
    db.select({ creatorId: creatorAccounts.creatorId, platform: creatorAccounts.platform }).from(creatorAccounts),
  ]);
  const platformsOf = new Map<string, Set<string>>();
  for (const row of accountRows) platformsOf.set(row.creatorId, (platformsOf.get(row.creatorId) ?? new Set()).add(row.platform));
  const urlsOf = new Map<string, string[]>();
  for (const row of codeRows) if (row.sourceUrl) urlsOf.set(row.creatorId, [...(urlsOf.get(row.creatorId) ?? []), row.sourceUrl]);
  return creatorRows.filter(({ id }) => {
    const platforms = platformsOf.get(id);
    if (!platforms) return true;
    const sources = sourcesOf(urlsOf.get(id) ?? []);
    return (sources.youtube && !platforms.has('youtube')) || (sources.applePodcast && !platforms.has('podcast'));
  }).length;
}

