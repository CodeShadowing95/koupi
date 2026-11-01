import { getCatalog } from '@/lib/catalog-server';
import { PropositionsView } from './propositions-view';

export default async function Page() {
  const { categories } = await getCatalog();
  return <PropositionsView categories={categories} />;
}
