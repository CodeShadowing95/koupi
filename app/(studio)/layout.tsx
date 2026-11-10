import type { Viewport } from 'next';
import { SITE_THEME_COLORS } from '@/lib/site-theme';
import '../(site)/site.css';
import './studio.css';
import { SiteEffects } from '@/components/site/effects';
import { SitePagesProvider } from '@/components/site/site-pages';
import { getSiteState } from '@/lib/site-settings-server';
import { getMediaMap } from '@/lib/catalog-server';
import { AvatarMapProvider } from '@/components/avatar-map';

// Barre d'état du téléphone : couleur du thème clair, accordée au thème sombre par le bouton soleil / lune.
export const viewport: Viewport = { themeColor: SITE_THEME_COLORS.light };

// Merkod Studio (espace créateur) : même direction « Comptoir clair » que le site, mais sa propre coque,
// sans l'en-tête ni le pied de page du site public. On est dans les coulisses, pas sur la vitrine.
export default async function StudioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [{ off }, media] = await Promise.all([getSiteState(), getMediaMap()]);
  return (
    <SitePagesProvider off={off}>
      <AvatarMapProvider avatars={media.avatars} logos={media.logos}>
        {children}
        <SiteEffects />
      </AvatarMapProvider>
    </SitePagesProvider>
  );
}
