import { getCatalog } from '@/lib/catalog-server';
import { StatsView } from './stats-view';

export default async function Page() {
  const catalog = await getCatalog();
  return <StatsView catalog={catalog} />;
}
