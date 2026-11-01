import { getDb } from '@/db';
import { listCategoriesAdmin, listToolsAdmin } from '@/lib/catalog-admin';
import { ToolsView } from './tools-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [tools, categories] = await Promise.all([listToolsAdmin(db), listCategoriesAdmin(db)]);
  return <ToolsView tools={tools} categories={categories} />;
}
