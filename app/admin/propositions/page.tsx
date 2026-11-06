import { getDb } from '@/db';
import { loadCatalog } from '@/lib/catalog-db';
import { toolOptions } from '@/lib/codes-admin';
import { PropositionsView } from './propositions-view';

export const metadata = { title: 'Propositions · Admin Merkod' };

export const dynamic = 'force-dynamic';

// Lecture directe, archives comprises : le formulaire de validation prévient si le code est déjà au catalogue.
export default async function Page() {
  const db = getDb();
  const [catalog, tools] = await Promise.all([loadCatalog(db, { includeArchived: true }), toolOptions(db)]);
  const creators = [...new Set(catalog.codes.map(code => code.creator))].sort((a, b) => a.localeCompare(b, 'fr'));
  const existing = catalog.codes.map(code => ({ id: code.id, toolSlug: code.toolSlug, code: code.code, archived: code.archived }));
  return <PropositionsView categories={catalog.categories} tools={tools} creators={creators} existing={existing} />;
}
