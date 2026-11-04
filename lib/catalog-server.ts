// Catalogue lu depuis la base, côté serveur uniquement.
// Le résultat est mis en cache (étiquette « catalog ») et rafraîchi dès que l'admin modifie un outil ou un code
// (revalidateCatalog). Les pages qui l'appellent sont rendues à la demande, jamais pendant le build.
import { revalidateTag, unstable_cache } from 'next/cache';
import { connection } from 'next/server';
import { getDb } from '@/db';
import { loadCatalog } from './catalog-db';
import { loadCreatorProfile, type CreatorProfile } from './creator-profile';
import { loadCreatorFacts, type CreatorFacts } from './creator-directory';
import type { Catalog } from './data';
import { loadAvatarMap, loadLogoMap } from './stored-images';

export const CATALOG_TAG = 'catalog';

const cachedCatalog = unstable_cache(() => loadCatalog(getDb()), ['catalog-v1'], { tags: [CATALOG_TAG], revalidate: 300 });

export async function getCatalog(): Promise<Catalog> {
  await connection();
  return cachedCatalog();
}

const cachedCreatorProfile = unstable_cache((slug: string) => loadCreatorProfile(getDb(), slug), ['creator-profile-v1'], { tags: [CATALOG_TAG], revalidate: 300 });

/** Présentation et comptes d'un créateur, rafraîchis avec le catalogue. */
export async function getCreatorProfile(slug: string): Promise<CreatorProfile | null> {
  await connection();
  return cachedCreatorProfile(slug);
}

// Les copies bougent toute la journée : 5 minutes de retard suffisent pour un total du mois.
const cachedCreatorFacts = unstable_cache(() => loadCreatorFacts(getDb()), ['creator-facts-v1'], { tags: [CATALOG_TAG], revalidate: 300 });

/** Présentation, réseaux et copies du mois de chaque créateur, par slug. */
export async function getCreatorFacts(): Promise<Record<string, CreatorFacts>> {
  await connection();
  return cachedCreatorFacts();
}

export type MediaMap = { avatars: Record<string, string>; logos: Record<string, string>; logoDev: boolean };
const cachedMediaMap = unstable_cache(async (): Promise<MediaMap> => {
  const db = getDb();
  const [avatars, { logos, logoDev }] = await Promise.all([loadAvatarMap(db), loadLogoMap(db)]);
  return { avatars, logos, logoDev };
}, ['media-map-v1'], { tags: [CATALOG_TAG], revalidate: 3600 });

/** Photos des créateurs (par nom) et logos des outils (par slug) gardés en base. Vide si la base ne répond pas. */
export async function getMediaMap(): Promise<MediaMap> {
  // Hors du try : connection() interrompt volontairement le rendu statique, l'attraper figerait une page sans images.
  await connection();
  try {
    return await cachedMediaMap();
  } catch (error) {
    console.error('media map failed', error);
    return { avatars: {}, logos: {}, logoDev: false };
  }
}

export function revalidateCatalog() {
  revalidateTag(CATALOG_TAG);
}
