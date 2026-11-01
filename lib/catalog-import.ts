// Import des fichiers de data/ dans la base (npm run db:import, lancé aussi à chaque déploiement).
// On n'ajoute que ce qui manque : une catégorie, un outil ou un code déjà en base n'est jamais modifié,
// pour ne pas écraser ce que l'admin a changé. Un code archivé reste archivé.
import type { Db } from '@/db';
import { categories, codes, creators, tools } from '@/db/schema';
import { buildCatalog, parseCsv, slugify } from '../scripts/build-catalog.mjs';

export type ImportInput = Parameters<typeof buildCatalog>[0];
export type ImportResult = { categories: number; tools: number; creators: number; codes: number };

const isHttp = (value: string | undefined) => Boolean(value && /^https?:\/\//i.test(value));

export async function importCatalog(db: Db, input: ImportInput): Promise<ImportResult> {
  const built = buildCatalog(input);
  const toolRows = parseCsv(input.toolsCsv);

  // Un petit décalage par ligne garde l'ordre des fichiers quand on relit la base (même lot = même instant).
  const now = Date.now();
  const at = (i: number) => ({ createdAt: new Date(now + i), updatedAt: new Date(now + i) });

  const categoryValues = built.categories.map((category, i) => ({ slug: category.slug, name: category.name, createdAt: new Date(now + i) }));
  const insertedCategories = categoryValues.length
    ? await db.insert(categories).values(categoryValues).onConflictDoNothing().returning({ slug: categories.slug })
    : [];

  const toolValues = toolRows.map((row, i) => {
    const slug = slugify(row.outil);
    return {
      ...at(i),
      slug,
      name: row.outil,
      categorySlug: slugify(row.categorie),
      website: `https://${row.site.replace(/^https?:\/\//, '')}`,
      description: input.manual.descriptions[slug] ?? null,
      priority: Math.min(5, Math.max(1, Number(row.priorite) || 3)),
    };
  });
  const insertedTools = toolValues.length
    ? await db.insert(tools).values(toolValues).onConflictDoNothing().returning({ id: tools.id })
    : [];

  const creatorNames = [...new Map(built.codes.map(code => [slugify(code.creator), code.creator])).entries()].filter(([slug]) => slug);
  const insertedCreators = creatorNames.length
    ? await db.insert(creators).values(creatorNames.map(([slug, name], i) => ({ slug, name, ...at(i) }))).onConflictDoNothing().returning({ id: creators.id })
    : [];
  const creatorIds = new Map((await db.select({ id: creators.id, slug: creators.slug }).from(creators)).map(row => [row.slug, row.id]));

  const toolIds = new Map((await db.select({ id: tools.id, name: tools.name }).from(tools)).map(row => [row.name.toLowerCase(), row.id]));
  const codeValues = built.codes.flatMap(code => {
    const toolId = toolIds.get(code.tool.toLowerCase());
    const creatorId = creatorIds.get(slugify(code.creator));
    if (!toolId || !creatorId || !isHttp(code.source)) return [];
    const up = Math.round((code.votes * code.success) / 100);
    return [{
      importKey: code.id,
      toolId,
      code: code.code,
      discount: code.discount,
      creatorId,
      creatorLink: isHttp(code.creatorLink) ? code.creatorLink! : null,
      sourceUrl: code.source,
      sourceTitle: code.sourceTitle,
      status: code.status as 'pending' | 'to_test' | 'verified' | 'rejected',
      note: code.note ?? null,
      votesUp: up,
      votesDown: code.votes - up,
    }];
  });
  const insertedCodes = codeValues.length
    ? await db.insert(codes).values(codeValues.map((value, i) => ({ ...value, ...at(i) })))
      .onConflictDoNothing({ target: codes.importKey }).returning({ id: codes.id })
    : [];

  return { categories: insertedCategories.length, tools: insertedTools.length, creators: insertedCreators.length, codes: insertedCodes.length };
}
