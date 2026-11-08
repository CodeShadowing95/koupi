import { getDb } from '@/db';
import { aiConfigFrom, aiStatusOf } from '@/lib/ai-extract';
import { aiSpendSince, startOfMonthUtc } from '@/lib/verification-store';
import { listCategoriesAdmin, listToolsAdmin } from '@/lib/catalog-admin';
import { copiesByToolThisMonth } from '@/lib/creator-directory';
import { toolsWithoutImage } from '@/lib/stored-images';
import { ToolsView } from './tools-view';

export const metadata = { title: 'Outils · Admin Merkod' };

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [tools, categories, missingLogos, copies, spent] = await Promise.all([listToolsAdmin(db), listCategoriesAdmin(db), toolsWithoutImage(db), copiesByToolThisMonth(db), aiSpendSince(db, startOfMonthUtc())]);
  // « Trouver la catégorie » est grisé quand l'IA est coupée ou son plafond du mois atteint.
  const ai = aiStatusOf(aiConfigFrom(process.env), spent);
  return <ToolsView tools={tools.map(tool => ({ ...tool, copies: copies.get(tool.id) ?? 0 }))} categories={categories} missingLogos={missingLogos} youtubeReady={Boolean(process.env.YOUTUBE_API_KEY)} ai={{ active: ai.state === 'active', label: ai.label }} />;
}
