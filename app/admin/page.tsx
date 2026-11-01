import { getCatalog } from '@/lib/catalog-server';
import { DashboardView } from './dashboard-view';

export default async function Page() {
  const catalog = await getCatalog();
  return <DashboardView catalog={catalog} />;
}
