import { getDb } from '@/db';
import { loadCatalog } from '@/lib/catalog-db';
import { toolOptions } from '@/lib/codes-admin';
import { aiConfigFrom, aiStatusOf } from '@/lib/ai-extract';
import { aiSpendSince, startOfMonthUtc } from '@/lib/verification-store';
import { copiesByCodeThisMonth } from '@/lib/creator-directory';
import { CodesView } from './codes-view';

export const metadata = { title: 'Codes · Admin Merkod' };

export const dynamic = 'force-dynamic';

// Lecture directe (sans cache) : l'admin voit tout de suite ses changements, archives comprises.
export default async function Page() {
  const db = getDb();
  const [catalog, tools, copies, spent] = await Promise.all([loadCatalog(db, { includeArchived: true }), toolOptions(db), copiesByCodeThisMonth(db), aiSpendSince(db, startOfMonthUtc())]);
  const ai = aiStatusOf(aiConfigFrom(process.env), spent);
  return <CodesView codes={catalog.codes} tools={tools} categories={catalog.categories} copies={Object.fromEntries(copies)} ai={{ active: ai.state === 'active', label: ai.label }} />;
}
