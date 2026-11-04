import { getDb } from '@/db';
import { listCategoriesAdmin, listToolsAdmin } from '@/lib/catalog-admin';
import { toolsWithoutImage } from '@/lib/stored-images';
import { ToolsView } from './tools-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [tools, categories, missingLogos] = await Promise.all([listToolsAdmin(db), listCategoriesAdmin(db), toolsWithoutImage(db)]);
  return <ToolsView tools={tools} categories={categories} missingLogos={missingLogos} />;
}
