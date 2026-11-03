// Catalogue lu depuis la base, côté serveur uniquement.
// Le résultat est mis en cache (étiquette « catalog ») et rafraîchi dès que l'admin modifie un outil ou un code
// (revalidateCatalog). Les pages qui l'appellent sont rendues à la demande, jamais pendant le build.
import { revalidateTag, unstable_cache } from 'next/cache';
import { connection } from 'next/server';
import { getDb } from '@/db';
import { loadCatalog } from './catalog-db';
import { loadCreatorProfile, type CreatorProfile } from './creator-profile';
import type { Catalog } from './data';

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

export function revalidateCatalog() {
  revalidateTag(CATALOG_TAG);
}
