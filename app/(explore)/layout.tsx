import '../(site)/site.css';
import './explore.css';
import { SiteEffects } from '@/components/site/effects';
import { WebVitals } from '@/components/site/web-vitals';
import { SitePagesProvider } from '@/components/site/site-pages';
import { getSiteState } from '@/lib/site-settings-server';
import { getMediaMap } from '@/lib/catalog-server';
import { AvatarMapProvider } from '@/components/avatar-map';

// Page Explorer : même direction « Comptoir de nuit » que le site public, mais sa propre coque
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
