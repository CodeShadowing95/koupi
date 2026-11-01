// Lecture du catalogue (catégories, outils, codes) depuis la base.
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '@/db';
import { categories as categoriesTable, codes as codesTable, creators as creatorsTable, tools as toolsTable } from '@/db/schema';
import { isPublic, successRate, type Catalog, type Category, type Code, type Tool } from './data';

export function defaultDescription(name: string) { return `Les codes promo donnés par les créateurs pour ${name}.`; }

/** includeArchived : l'admin voit aussi les codes archivés (pour les restaurer). Le site, jamais. */
export async function loadCatalog(db: Db, options: { includeArchived?: boolean } = {}): Promise<Catalog> {
  const [categoryRows, toolRows, codeRows] = await Promise.all([
    db.select().from(categoriesTable).orderBy(asc(categoriesTable.createdAt), asc(categoriesTable.name)),
    db.select().from(toolsTable).where(isNull(toolsTable.archivedAt)),
    db.select({ code: codesTable, tool: { name: toolsTable.name, slug: toolsTable.slug }, creator: { name: creatorsTable.name, slug: creatorsTable.slug } })
      .from(codesTable).innerJoin(toolsTable, eq(codesTable.toolId, toolsTable.id)).innerJoin(creatorsTable, eq(codesTable.creatorId, creatorsTable.id))
      .where(options.includeArchived ? isNull(toolsTable.archivedAt) : and(isNull(codesTable.archivedAt), isNull(toolsTable.archivedAt)))
      .orderBy(asc(codesTable.createdAt), asc(codesTable.code)),
  ]);

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
    ...(code.creatorLink ? { creatorLink: code.creatorLink } : {}),
    votes: code.votesUp + code.votesDown,
    success: successRate(code.votesUp, code.votesDown),
    ...(code.note ? { note: code.note } : {}),
    lastTestedAt: code.lastTestedAt?.toISOString() ?? null,
    createdAt: code.createdAt.toISOString(),
    ...(code.archivedAt ? { archived: true } : {}),
  }));
  const live = codes.filter(code => !code.archived);

  const categoryName = new Map(categoryRows.map(row => [row.slug, row.name]));
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
    }))
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, 'fr'));

  const categories: Category[] = categoryRows.map(row => ({
    slug: row.slug,
    name: row.name,
    count: tools.filter(tool => tool.category === row.name).length,
    tracked: toolRows.filter(tool => tool.categorySlug === row.slug).length,
  }));

  return { categories, tools, codes, tracked: toolRows.length };
}
