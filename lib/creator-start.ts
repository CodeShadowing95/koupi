// Studio ouvert à tous (décision du 2026-11-08) : un créateur sans chaîne, ou qui ne veut pas prouver tout de suite,
// passe l'étape de revendication et ouvre son studio sur une page à son nom, « non vérifiée » tant qu'aucun compte
// n'est prouvé. Ses codes passent par la relecture de l'admin. Garde-fou : il ne peut pas prendre le nom ni le @ d'une
// page existante (sinon n'importe qui ouvrirait « MrBeast ») ; on lui propose de la revendiquer à la place.
import { eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { creators, creatorUsers } from '@/db/schema';
import { fold, loadFindablePages, type FoundPage } from './creator-studio';
import { slugify } from './slug';

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string; match?: { slug: string; name: string } };

export const OWN_NAME_MIN = 2;
export const OWN_NAME_MAX = 60;

/** Nom de créateur saisi : espaces resserrés, 2 à 60 caractères, au moins deux lettres ou chiffres. */
export function parseOwnName(value: unknown): Parsed<{ name: string; slug: string }> {
  const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (name.length < OWN_NAME_MIN || name.length > OWN_NAME_MAX) return { ok: false, error: `Ton nom de créateur doit faire entre ${OWN_NAME_MIN} et ${OWN_NAME_MAX} caractères.` };
  const slug = slugify(name).slice(0, 60).replace(/-+$/, '');
  if (fold(name).length < 2 || !slug) return { ok: false, error: 'Ton nom de créateur doit contenir au moins deux lettres ou chiffres.' };
  return { ok: true, data: { name, slug } };
}

/** La page existante qui porte déjà ce nom, cette adresse ou ce @, ou null. */
export function takenBy(pages: FoundPage[], name: string, slug: string): FoundPage | null {
  const wanted = new Set([fold(name), fold(slug)]);
  return pages.find(page => [page.name, page.slug, ...page.accounts.map(account => account.handle)].some(key => wanted.has(fold(key)))) ?? null;
}

/** Crée la page du créateur connecté et lui ouvre son studio. Refusé s'il a déjà une page ou si le nom est pris. */
export async function startOwnPage(db: Db, user: { id: string; creator: unknown }, rawName: unknown, now = new Date()): Promise<Parsed<{ slug: string; name: string }>> {
  if (user.creator) return { ok: false, error: 'Ton studio est déjà relié à une page.' };
  const parsed = parseOwnName(rawName);
  if (!parsed.ok) return parsed;
  const { name, slug } = parsed.data;
  const taken = takenBy(await loadFindablePages(db), name, slug);
  if (taken) return { ok: false, error: `Une page « ${taken.name} » existe déjà sur Merkod. Si c’est toi, revendique-la ; sinon, choisis un autre nom.`, match: { slug: taken.slug, name: taken.name } };
  // Pas de transaction (pilote HTTP de Neon) : le slug unique empêche deux pages au même nom.
  const [created] = await db.insert(creators).values({ slug, name }).onConflictDoNothing().returning({ id: creators.id });
  if (!created) return { ok: false, error: 'Ce nom vient d’être pris. Choisis-en un autre.' };
  await db.update(creatorUsers).set({ creatorId: created.id, accessGrantedAt: now }).where(eq(creatorUsers.id, user.id));
  return { ok: true, data: { slug, name } };
}
