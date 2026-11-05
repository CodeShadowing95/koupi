import { getDb } from '@/db';
import { listCategoriesAdmin, listToolsAdmin } from '@/lib/catalog-admin';
import { copiesByToolThisMonth } from '@/lib/creator-directory';
import { toolsWithoutImage } from '@/lib/stored-images';
import { ToolsView } from './tools-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [tools, categories, missingLogos, copies] = await Promise.all([listToolsAdmin(db), listCategoriesAdmin(db), toolsWithoutImage(db), copiesByToolThisMonth(db)]);
  return <ToolsView tools={tools.map(tool => ({ ...tool, copies: copies.get(tool.id) ?? 0 }))} categories={categories} missingLogos={missingLogos} youtubeReady={Boolean(process.env.YOUTUBE_API_KEY)} />;
}
