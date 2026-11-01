// Gestion du catalogue dans l'admin : outils, créateurs et catégories.
// Comme pour les codes, on n'efface rien : un outil est archivé (il disparaît du site avec ses codes).
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { categories, codes, creators, tools } from '@/db/schema';
import { slugify } from './slug';
import { validUrl } from './codes-admin';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };
function text(value: unknown, max: number): string { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
const visible = sql`${codes.status} in ('verified','to_test') and ${codes.archivedAt} is null`;

// ---------- Outils ----------

export type ToolInput = { name: string; categorySlug: string; website: string; description: string | null; priority: number };

export function parseToolInput(body: Record<string, unknown>): Parsed<ToolInput> {
  const name = text(body.name, 120), categorySlug = text(body.categorySlug, 80), raw = text(body.website, 300);
  const website = /^https?:\/\//i.test(raw) ? raw : raw ? `https://${raw}` : '';
  const priority = Number(body.priority ?? 3);
  if (!name || !slugify(name)) return { ok: false, error: 'Indique le nom de l’outil.' };
  if (!categorySlug) return { ok: false, error: 'Choisis une catégorie.' };
  if (!validUrl(website)) return { ok: false, error: 'Le site officiel doit être une adresse web valide.' };
  if (!Number.isInteger(priority) || priority < 1 || priority > 5) return { ok: false, error: 'La priorité va de 1 (haute) à 5.' };
  return { ok: true, data: { name, categorySlug, website, description: text(body.description, 300) || null, priority } };
}

export type AdminTool = { id: string; slug: string; name: string; categorySlug: string; category: string; website: string; description: string | null; priority: number; codes: number; visible: number; archived: boolean };

export async function listToolsAdmin(db: Db): Promise<AdminTool[]> {
  const rows = await db.select({
    id: tools.id, slug: tools.slug, name: tools.name, categorySlug: tools.categorySlug, category: categories.name, website: tools.website,
    description: tools.description, priority: tools.priority, archivedAt: tools.archivedAt,
    codes: sql<number>`count(${codes.id}) filter (where ${codes.archivedAt} is null)::int`,
    visible: sql<number>`count(${codes.id}) filter (where ${visible})::int`,
  }).from(tools).innerJoin(categories, eq(tools.categorySlug, categories.slug)).leftJoin(codes, eq(codes.toolId, tools.id))
    .groupBy(tools.id, categories.name).orderBy(asc(tools.priority), asc(tools.name));
  return rows.map(({ archivedAt, ...row }) => ({ ...row, archived: Boolean(archivedAt) }));
}

async function categoryExists(db: Db, slug: string) {
  return (await db.select({ slug: categories.slug }).from(categories).where(eq(categories.slug, slug)).limit(1)).length > 0;
}

async function nameTaken(db: Db, name: string, exceptId?: string) {
  const condition = sql`lower(${tools.name}) = lower(${name})`;
  return (await db.select({ id: tools.id }).from(tools).where(exceptId ? and(condition, ne(tools.id, exceptId)) : condition).limit(1)).length > 0;
}

export async function createTool(db: Db, input: ToolInput): Promise<Parsed<{ id: string; slug: string }>> {
  if (!(await categoryExists(db, input.categorySlug))) return { ok: false, error: 'Catégorie inconnue.' };
  if (await nameTaken(db, input.name)) return { ok: false, error: 'Un outil porte déjà ce nom.' };
  const slug = slugify(input.name);
  const [row] = await db.insert(tools).values({ ...input, slug }).onConflictDoNothing().returning({ id: tools.id, slug: tools.slug });
  return row ? { ok: true, data: row } : { ok: false, error: 'Un outil a déjà cette adresse sur le site.' };
}

/** Modifie un outil. Le slug (son adresse sur le site) ne change pas, pour ne pas casser les liens. */
export async function updateTool(db: Db, id: string, input: ToolInput): Promise<Parsed<{ id: string }>> {
  const [current] = await db.select({ id: tools.id }).from(tools).where(eq(tools.id, id)).limit(1);
  if (!current) return { ok: false, error: 'Outil introuvable.' };
  if (!(await categoryExists(db, input.categorySlug))) return { ok: false, error: 'Catégorie inconnue.' };
  if (await nameTaken(db, input.name, id)) return { ok: false, error: 'Un outil porte déjà ce nom.' };
  await db.update(tools).set({ ...input, updatedAt: new Date() }).where(eq(tools.id, id));
  return { ok: true, data: { id } };
}

export async function setToolArchived(db: Db, id: string, archived: boolean): Promise<boolean> {
  const rows = await db.update(tools).set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() }).where(eq(tools.id, id)).returning({ id: tools.id });
  return rows.length > 0;
}

// ---------- Créateurs ----------

export type AdminCreator = { id: string; slug: string; name: string; codes: number; visible: number; tools: string[] };

export async function listCreatorsAdmin(db: Db): Promise<AdminCreator[]> {
  const rows = await db.select({
    id: creators.id, slug: creators.slug, name: creators.name,
    codes: sql<number>`count(${codes.id}) filter (where ${codes.archivedAt} is null)::int`,
    visible: sql<number>`count(${codes.id}) filter (where ${visible})::int`,
    tools: sql<string[]>`coalesce(array_agg(distinct ${tools.name}) filter (where ${tools.name} is not null and ${codes.archivedAt} is null), '{}')`,
  }).from(creators).leftJoin(codes, eq(codes.creatorId, creators.id)).leftJoin(tools, eq(codes.toolId, tools.id))
    .groupBy(creators.id).orderBy(asc(creators.name));
  return rows;
}

/** Renomme un créateur (orthographe, nom de chaîne). Son adresse sur le site reste la même. */
export async function renameCreator(db: Db, id: string, rawName: unknown): Promise<Parsed<{ id: string }>> {
  const name = text(rawName, 160);
  if (!name) return { ok: false, error: 'Indique le nom du créateur.' };
  const rows = await db.update(creators).set({ name, updatedAt: new Date() }).where(eq(creators.id, id)).returning({ id: creators.id });
  return rows.length ? { ok: true, data: { id } } : { ok: false, error: 'Créateur introuvable.' };
}

// ---------- Catégories ----------

export type AdminCategory = { slug: string; name: string; tools: number; covered: number };

export async function listCategoriesAdmin(db: Db): Promise<AdminCategory[]> {
  const toolRows = await listToolsAdmin(db);
  const rows = await db.select().from(categories).orderBy(asc(categories.createdAt), asc(categories.name));
  return rows.map(row => {
    const inCategory = toolRows.filter(tool => tool.categorySlug === row.slug && !tool.archived);
    return { slug: row.slug, name: row.name, tools: inCategory.length, covered: inCategory.filter(tool => tool.visible > 0).length };
  });
}

async function categoryNameTaken(db: Db, name: string, exceptSlug?: string) {
  const condition = sql`lower(${categories.name}) = lower(${name})`;
  return (await db.select({ slug: categories.slug }).from(categories).where(exceptSlug ? and(condition, ne(categories.slug, exceptSlug)) : condition).limit(1)).length > 0;
}

export async function createCategory(db: Db, rawName: unknown): Promise<Parsed<{ slug: string }>> {
  const name = text(rawName, 80), slug = slugify(name);
  if (!name || !slug) return { ok: false, error: 'Indique le nom de la catégorie.' };
  if (await categoryNameTaken(db, name)) return { ok: false, error: 'Cette catégorie existe déjà.' };
  const [row] = await db.insert(categories).values({ slug, name }).onConflictDoNothing().returning({ slug: categories.slug });
  return row ? { ok: true, data: row } : { ok: false, error: 'Une catégorie a déjà cette adresse sur le site.' };
}

/** Renomme une catégorie. Son adresse sur le site (slug) reste la même. */
export async function renameCategory(db: Db, slug: string, rawName: unknown): Promise<Parsed<{ slug: string }>> {
  const name = text(rawName, 80);
  if (!name) return { ok: false, error: 'Indique le nom de la catégorie.' };
  if (await categoryNameTaken(db, name, slug)) return { ok: false, error: 'Une autre catégorie porte déjà ce nom.' };
  const rows = await db.update(categories).set({ name }).where(eq(categories.slug, slug)).returning({ slug: categories.slug });
  return rows.length ? { ok: true, data: { slug } } : { ok: false, error: 'Catégorie introuvable.' };
}

