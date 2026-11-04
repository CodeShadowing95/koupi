import { getDb } from '@/db';
import { listCategoriesAdmin, listFamilies } from '@/lib/catalog-admin';
import { CategoriesView } from './categories-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [categories, families] = await Promise.all([listCategoriesAdmin(db), listFamilies(db)]);
  return <CategoriesView categories={categories} families={families} />;
}
