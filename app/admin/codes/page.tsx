import { getDb } from '@/db';
import { loadCatalog } from '@/lib/catalog-db';
import { toolOptions } from '@/lib/codes-admin';
import { copiesByCodeThisMonth } from '@/lib/creator-directory';
import { CodesView } from './codes-view';

export const dynamic = 'force-dynamic';

// Lecture directe (sans cache) : l'admin voit tout de suite ses changements, archives comprises.
export default async function Page() {
  const db = getDb();
  const [catalog, tools, copies] = await Promise.all([loadCatalog(db, { includeArchived: true }), toolOptions(db), copiesByCodeThisMonth(db)]);
  return <CodesView codes={catalog.codes} tools={tools} categories={catalog.categories} copies={Object.fromEntries(copies)} />;
}
