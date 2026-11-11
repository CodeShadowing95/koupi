import type { Viewport } from 'next';
import { SITE_THEME_COLORS } from '@/lib/site-theme';
import './site.css';
import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { SiteEffects } from '@/components/site/effects';
import { WebVitals } from '@/components/site/web-vitals';
import { SitePagesProvider } from '@/components/site/site-pages';
import { getSiteState } from '@/lib/site-settings-server';
import { getMediaMap } from '@/lib/catalog-server';
import { AvatarMapProvider } from '@/components/avatar-map';

// Barre d'état du téléphone : couleur du thème clair, accordée au thème sombre par le bouton soleil / lune.
export const viewport: Viewport = { themeColor: SITE_THEME_COLORS.light };

// Site public : direction « Comptoir clair » (voir site.css, ADR-0045). Le back-office garde sa propre mise en page.
export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Pages coupées par l'admin : leurs liens disparaissent partout (le middleware, lui, renvoie la 404).
  const [{ off }, media] = await Promise.all([getSiteState(), getMediaMap()]);
  return (
    <SitePagesProvider off={off}>
    <AvatarMapProvider avatars={media.avatars} logos={media.logos}>
    <div className="kp">
      <SiteHeader />
      <div className="k-main" id="contenu">{children}</div>
      <SiteFooter logoDev={media.logoDev} />
      <SiteEffects />
      <WebVitals />
    </div>
    </AvatarMapProvider>
    </SitePagesProvider>
  );
}
