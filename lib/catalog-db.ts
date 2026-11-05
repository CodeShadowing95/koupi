// Lecture du catalogue (catégories, outils, codes) depuis la base.
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '@/db';
import { categories as categoriesTable, categoryFamilies, codes as codesTable, creatorAccounts, creators as creatorsTable, tools as toolsTable, watchedSources } from '@/db/schema';
import { appleEpisodeRef } from './apple-podcasts';
import { creatorLevelFromAccounts } from './creator-level';
import type { CreatorLevel } from './verification';
import { isPublic, successRate, type Catalog, type Category, type Code, type Family, type Tool } from './data';

function shownLevel(level: CreatorLevel | undefined): Pick<Code, 'creatorLevel'> {
  return level === 'checked' || level === 'verified' ? { creatorLevel: level } : {};
}

export function defaultDescription(name: string) { return `Les codes promo donnés par les créateurs pour ${name}.`; }

/** includeArchived : l'admin voit aussi les codes archivés (pour les restaurer). Le site, jamais. */
export async function loadCatalog(db: Db, options: { includeArchived?: boolean } = {}): Promise<Catalog> {
  const [categoryRows, toolRows, codeRows, accountRows, podcastRows, familyRows] = await Promise.all([
    db.select().from(categoriesTable).orderBy(asc(categoriesTable.createdAt), asc(categoriesTable.name)),
    db.select().from(toolsTable).where(isNull(toolsTable.archivedAt)),
    db.select({ code: codesTable, tool: { name: toolsTable.name, slug: toolsTable.slug }, creator: { name: creatorsTable.name, slug: creatorsTable.slug } })
      .from(codesTable).innerJoin(toolsTable, eq(codesTable.toolId, toolsTable.id)).innerJoin(creatorsTable, eq(codesTable.creatorId, creatorsTable.id))
      .where(options.includeArchived ? isNull(toolsTable.archivedAt) : and(isNull(codesTable.archivedAt), isNull(toolsTable.archivedAt)))
      .orderBy(asc(codesTable.createdAt), asc(codesTable.code)),
    db.select().from(creatorAccounts),
    db.select({ externalId: watchedSources.externalId, title: watchedSources.title }).from(watchedSources).where(eq(watchedSources.platform, 'podcast')),
    db.select({ slug: categoryFamilies.slug, name: categoryFamilies.name }).from(categoryFamilies).orderBy(asc(categoryFamilies.position), asc(categoryFamilies.name)),
  ]);
  // Nom du podcast suivi pour un code venu d'un épisode Apple Podcasts.
  const podcastTitle = new Map(podcastRows.map(row => [row.externalId, row.title]));
  const podcastOf = (url: string): Pick<Code, 'podcast'> => {
    const ref = appleEpisodeRef(url);
    const title = ref ? podcastTitle.get(String(ref.podcastId)) : undefined;
    return title ? { podcast: title } : {};
  };

  // Niveau de chaque créateur d'après ses comptes : seul « Contrôlé par Merkod » ou « Créateur vérifié » est affiché.
  const accountsOf = new Map<string, (typeof accountRows)[number][]>();
  for (const account of accountRows) accountsOf.set(account.creatorId, [...(accountsOf.get(account.creatorId) ?? []), account]);
  const levelOf = new Map([...accountsOf].map(([creatorId, accounts]) => [creatorId, creatorLevelFromAccounts(accounts)]));

  const codes: Code[] = codeRows.map(({ code, tool, creator }) => ({
    id: code.id,
    tool: tool.name,
    toolSlug: tool.slug,
    creator: creator.name,
    creatorSlug: creator.slug,
    code: code.code,
    discount: code.discount,
    status: code.status,
    source: code.sourceUrl,
    sourceTitle: code.sourceTitle,
    ...podcastOf(code.sourceUrl),
    ...(code.creatorLink ? { creatorLink: code.creatorLink } : {}),
    votes: code.votesUp + code.votesDown,
    success: successRate(code.votesUp, code.votesDown),
    ...(code.note ? { note: code.note } : {}),
    lastTestedAt: code.lastTestedAt?.toISOString() ?? null,
    paymentTestedAt: code.paymentTestedAt?.toISOString() ?? null,
    expiresOn: code.expiresOn ?? null,
    createdAt: code.createdAt.toISOString(),
    ...shownLevel(levelOf.get(code.creatorId)),
    ...(code.archivedAt ? { archived: true } : {}),
    // L'origine ne sert qu'à l'admin : le site public n'en a pas besoin.
    ...(options.includeArchived ? { origin: code.origin } : {}),
  }));
  const live = codes.filter(code => !code.archived);

  const categoryName = new Map(categoryRows.map(row => [row.slug, row.name]));
  const familyOf = new Map(categoryRows.map(row => [row.slug, row.familySlug]));
  const publicCount = new Map<string, number>();
  for (const code of live) if (isPublic(code)) publicCount.set(code.toolSlug, (publicCount.get(code.toolSlug) ?? 0) + 1);

  const tools: Tool[] = toolRows
    .filter(row => publicCount.has(row.slug))
    .map(row => ({
      slug: row.slug,
      name: row.name,
      category: categoryName.get(row.categorySlug) ?? row.categorySlug,
      website: row.website,
      description: row.description ?? defaultDescription(row.name),
      priority: row.priority,
      codes: publicCount.get(row.slug) ?? 0,
      ...(familyOf.get(row.categorySlug) ? { family: familyOf.get(row.categorySlug)! } : {}),
    }))
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, 'fr'));

  const categories: Category[] = categoryRows.map(row => ({
    slug: row.slug,
    name: row.name,
    family: row.familySlug,
    count: tools.filter(tool => tool.category === row.name).length,
    tracked: toolRows.filter(tool => tool.categorySlug === row.slug).length,
  }));

  const families: Family[] = familyRows;

  return { categories, families, tools, codes, tracked: toolRows.length };
}
