import './admin.css';
import { AdminShell } from '@/components/admin-shell';
import { themeBootScript } from '@/lib/admin-theme';
import { getCatalog } from '@/lib/catalog-server';

async function codesToTest() {
  try {
    return (await getCatalog()).codes.filter(code => code.status === 'to_test').length;
  } catch {
    return 0; // Base injoignable : le menu s'affiche quand même, sans badge.
  }
}

// Back-office : menu latéral, thème clair ou sombre (suit le système, ou le choix enregistré).
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const toTest = await codesToTest();
  return (
    <div className="admin-root" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <AdminShell toTest={toTest}>{children}</AdminShell>
    </div>
  );
}
