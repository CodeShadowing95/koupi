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
import { loadAvatarMap } from './stored-images';

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

const cachedAvatarMap = unstable_cache(() => loadAvatarMap(getDb()), ['avatar-map-v1'], { tags: [CATALOG_TAG], revalidate: 3600 });

/** Photos des créateurs gardées en base, par nom. Vide si la base ne répond pas : les avatars gardent leurs initiales. */
export async function getAvatarMap(): Promise<Record<string, string>> {
  try {
    await connection();
    return await cachedAvatarMap();
  } catch (error) {
    console.error('avatar map failed', error);
    return {};
  }
}

export function revalidateCatalog() {
  revalidateTag(CATALOG_TAG);
}
