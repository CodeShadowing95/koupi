import { getDb } from '@/db';
import { listCategoriesAdmin } from '@/lib/catalog-admin';
import { CategoriesView } from './categories-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return <CategoriesView categories={await listCategoriesAdmin(getDb())} />;
}
