import { getDb } from '@/db';
import { aiConfigFrom, aiStatusOf } from '@/lib/ai-extract';
import { listCategoriesAdmin } from '@/lib/catalog-admin';
import { aiSpendSince, startOfMonthUtc } from '@/lib/verification-store';
import { CategoriesView } from './categories-view';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const [categories, spent] = await Promise.all([listCategoriesAdmin(db), aiSpendSince(db, startOfMonthUtc())]);
  const ai = aiStatusOf(aiConfigFrom(process.env), spent);
  return <CategoriesView categories={categories} search={{ youtube: Boolean(process.env.YOUTUBE_API_KEY), ai: { active: ai.state === 'active', label: ai.label } }} />;
}
