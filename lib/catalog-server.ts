// Catalogue lu depuis la base, côté serveur uniquement.
// Le résultat est mis en cache (étiquette « catalog ») et rafraîchi dès que l'admin modifie un outil ou un code
// (revalidateCatalog). Les pages qui l'appellent sont rendues à la demande, jamais pendant le build.
import { revalidateTag, unstable_cache } from 'next/cache';
import { connection } from 'next/server';
import { getDb } from '@/db';
import { loadCatalog } from './catalog-db';
import type { Catalog } from './data';

export const CATALOG_TAG = 'catalog';

const cachedCatalog = unstable_cache(() => loadCatalog(getDb()), ['catalog-v1'], { tags: [CATALOG_TAG], revalidate: 300 });

export async function getCatalog(): Promise<Catalog> {
  await connection();
  return cachedCatalog();
}

export function revalidateCatalog() {
  revalidateTag(CATALOG_TAG);
}
