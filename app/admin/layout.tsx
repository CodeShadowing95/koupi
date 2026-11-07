import './admin.css';
import { AdminShell } from '@/components/admin-shell';
import { themeBootScript } from '@/lib/admin-theme';
import { getCatalog, getMediaMap } from '@/lib/catalog-server';
import { AvatarMapProvider } from '@/components/avatar-map';
import { getDb } from '@/db';
import { cookies } from 'next/headers';
import { countNewFeedback } from '@/lib/feedback';
import { countOpenCreatorRequests } from '@/lib/creator-requests';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session';
import { navWaitingCounts, type NavWaiting } from '@/lib/admin-nav-counts';

async function codesToTest() {
  try {
    return (await getCatalog()).codes.filter(code => code.status === 'to_test').length;
  } catch {
    return 0; // Base injoignable : le menu s'affiche quand même, sans badge.
  }
}

async function feedbackToRead() {
  try {
    return await countNewFeedback(getDb());
  } catch {
    return 0;
  }
}

async function requestsToHandle() {
  try {
    return await countOpenCreatorRequests(getDb());
  } catch {
    return 0;
  }
}

async function waiting(): Promise<NavWaiting> {
  try {
    return await navWaitingCounts(getDb());
  } catch {
    return {};
  }
}

// Back-office : menu latéral, thème clair ou sombre (suit le système, ou le choix enregistré).
// Sans session admin (page de connexion), rien n'est lu en base : la page publique de connexion ne doit dévoiler
// ni le nombre de codes à tester, ni les avis, ni les photos. Le menu les lit après la connexion (AdminShell).
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const signedIn = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET);
  const [toTest, newFeedback, newRequests, more, media] = signedIn
    ? await Promise.all([codesToTest(), feedbackToRead(), requestsToHandle(), waiting(), getMediaMap()])
    : [0, 0, 0, {}, { avatars: {}, logos: {} }];
  return (
    <div className="admin-root" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <AvatarMapProvider avatars={media.avatars} logos={media.logos}><AdminShell toTest={toTest} newFeedback={newFeedback} newRequests={newRequests} waiting={more}>{children}</AdminShell></AvatarMapProvider>
    </div>
  );
}
