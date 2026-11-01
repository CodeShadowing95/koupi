import './admin.css';
import { AdminShell } from '@/components/admin-shell';
import { themeBootScript } from '@/lib/admin-theme';

// Back-office : menu latéral, thème clair ou sombre (suit le système, ou le choix enregistré).
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-root" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
