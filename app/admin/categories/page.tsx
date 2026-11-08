import { getDb } from '@/db';
import { aiConfigFrom, aiStatusOf } from '@/lib/ai-extract';
import { listCategoriesAdmin, listFamilies, listToolsAdmin } from '@/lib/catalog-admin';
import { aiSpendSince, startOfMonthUtc } from '@/lib/verification-store';
import { CategoriesView } from './categories-view';

export const metadata = { title: 'Catégories · Admin Merkod' };

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [categories, families, spent, toolRows] = await Promise.all([listCategoriesAdmin(db), listFamilies(db), aiSpendSince(db, startOfMonthUtc()), listToolsAdmin(db)]);
  // Outils actifs, pour « Ranger » : l'IA relit leur site et propose une meilleure catégorie.
  const tools = toolRows.filter(tool => !tool.archived).map(({ id, name, website, description, priority, categorySlug }) => ({ id, name, website, description, priority, categorySlug }));
  const ai = aiStatusOf(aiConfigFrom(process.env), spent);
  return <CategoriesView categories={categories} families={families} search={{ youtube: Boolean(process.env.YOUTUBE_API_KEY), ai: { active: ai.state === 'active', label: ai.label } }} tools={tools} />;
}
