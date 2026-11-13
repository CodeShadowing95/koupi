import { getDb } from '@/db';
import { loadCatalog } from '@/lib/catalog-db';
import { toolOptions } from '@/lib/codes-admin';
import { aiConfigFrom, aiStatusOf } from '@/lib/ai-extract';
import { aiSpendSince, startOfMonthUtc } from '@/lib/verification-store';
import { PropositionsView } from './propositions-view';

export const metadata = { title: 'Propositions · Admin Merkod' };

export const dynamic = 'force-dynamic';

// Lecture directe, archives comprises : le formulaire de validation prévient si le code est déjà au catalogue.
export default async function Page() {
  const db = getDb();
  const [catalog, tools, spent] = await Promise.all([loadCatalog(db, { includeArchived: true }), toolOptions(db), aiSpendSince(db, startOfMonthUtc())]);
  const ai = aiStatusOf(aiConfigFrom(process.env), spent);
  const creators = [...new Set(catalog.codes.filter(code => !code.foundByMerkod).map(code => code.creator))].sort((a, b) => a.localeCompare(b, 'fr'));
  const existing = catalog.codes.map(code => ({ id: code.id, toolSlug: code.toolSlug, code: code.code, archived: code.archived }));
  return <PropositionsView categories={catalog.categories} tools={tools} creators={creators} existing={existing} ai={{ active: ai.state === 'active', label: ai.label }} />;
}
