import './admin.css';
import { AdminShell } from '@/components/admin-shell';
import { themeBootScript } from '@/lib/admin-theme';
import { getCatalog, getMediaMap } from '@/lib/catalog-server';
import { AvatarMapProvider } from '@/components/avatar-map';

async function codesToTest() {
  try {
    return (await getCatalog()).codes.filter(code => code.status === 'to_test').length;
  } catch {
    return 0; // Base injoignable : le menu s'affiche quand même, sans badge.
  }
}

// Back-office : menu latéral, thème clair ou sombre (suit le système, ou le choix enregistré).
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [toTest, media] = await Promise.all([codesToTest(), getMediaMap()]);
  return (
    <div className="admin-root" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <AvatarMapProvider avatars={media.avatars} logos={media.logos}><AdminShell toTest={toTest}>{children}</AdminShell></AvatarMapProvider>
    </div>
  );
}
