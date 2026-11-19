import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session';
import { DEFAULT_SITE_STATE, parseSiteState, siteDecision, SITE_STATE_PATH, type SiteState } from '@/lib/site-pages';

// État du site (pages coupées, maintenance), gardé une minute par instance. Il ne vient plus de la base mais de
// /api/site-state, servi par le cache de Next et vidé quand l'admin change un interrupteur (ADR-0051) : lire la base
// à chaque visite, préchargement de lien ou passage de robot la gardait éveillée et épuisait le quota de Neon.
// Un changement fait dans l'admin s'applique partout en moins de STATE_TTL_MS. Sans réponse, le site reste ouvert.
const STATE_TTL_MS = 60_000;
let state: { value: SiteState; at: number } | null = null;

async function siteState(origin: string): Promise<SiteState> {
  if (state && Date.now() - state.at < STATE_TTL_MS) return state.value;
  try {
    const response = await fetch(new URL(SITE_STATE_PATH, origin), { cache: 'no-store', signal: AbortSignal.timeout(3_000) });
    if (!response.ok) throw new Error(`site state ${response.status}`);
    state = { value: parseSiteState(await response.json()), at: Date.now() };
  } catch (error) {
    console.error('middleware site state unavailable', error);
    state = { value: state?.value ?? DEFAULT_SITE_STATE, at: Date.now() };
  }
  return state.value;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET);

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!isAdmin) return NextResponse.redirect(new URL('/admin/login', request.url));
    return NextResponse.next();
  }

  // La route qui donne l'état ne passe pas par lui-même (sinon le middleware s'appellerait en boucle).
  if (pathname === SITE_STATE_PATH) return NextResponse.next();
  const decision = siteDecision(pathname, await siteState(request.nextUrl.origin), isAdmin);
  if (decision === 'pass') return NextResponse.next();
  const isApi = pathname.startsWith('/api/');
  if (decision === 'maintenance') {
    if (isApi) return NextResponse.json({ error: 'Merkod est en pause pour quelques instants.' }, { status: 503, headers: { 'Retry-After': '600' } });
    return NextResponse.rewrite(new URL('/maintenance', request.url), { status: 503, headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' } });
  }
  if (isApi) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Adresse interne qui n'existe pas : Next affiche la page 404 du site avec le bon statut.
  return NextResponse.rewrite(new URL('/_page-off', request.url), { headers: { 'Cache-Control': 'no-store' } });
}

// Toutes les adresses sauf les fichiers servis par Next et les images : le middleware tourne avec Node (accès à la base).
export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|woff2?|mp3)$).*)'],
};
