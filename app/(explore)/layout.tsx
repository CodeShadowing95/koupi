import type { Viewport } from 'next';
import { SITE_THEME_COLORS } from '@/lib/site-theme';
import '../(site)/site.css';
import './explore.css';
import { SiteEffects } from '@/components/site/effects';
import { WebVitals } from '@/components/site/web-vitals';
import { SitePagesProvider } from '@/components/site/site-pages';
import { getSiteState } from '@/lib/site-settings-server';
import { getMediaMap } from '@/lib/catalog-server';
import { AvatarMapProvider } from '@/components/avatar-map';

// Barre d'état du téléphone : couleur du thème clair, accordée au thème sombre par le bouton soleil / lune.
export const viewport: Viewport = { themeColor: SITE_THEME_COLORS.light };

// Page Explorer : même direction « Comptoir clair » que le site public, mais sa propre coque
// (colonne de rayons sur toute la hauteur et barre de recherche en haut) à la place de l'en-tête et du pied de page du site.
export default async function ExploreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [{ off }, media] = await Promise.all([getSiteState(), getMediaMap()]);
  return (
    <SitePagesProvider off={off}>
      <AvatarMapProvider avatars={media.avatars} logos={media.logos}>
        {children}
        <SiteEffects />
        <WebVitals />
      </AvatarMapProvider>
    </SitePagesProvider>
  );
}
