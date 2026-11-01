import { getDb } from '@/db';
import { getCatalog } from '@/lib/catalog-server';
import { toolOptions } from '@/lib/codes-admin';
import { PropositionsView } from './propositions-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [catalog, tools] = await Promise.all([getCatalog(), toolOptions(getDb())]);
  const creators = [...new Set(catalog.codes.map(code => code.creator))].sort((a, b) => a.localeCompare(b, 'fr'));
  return <PropositionsView categories={catalog.categories} tools={tools} creators={creators} />;
}
