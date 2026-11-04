import './site.css';
import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { SiteEffects } from '@/components/site/effects';
import { SitePagesProvider } from '@/components/site/site-pages';
import { getSiteState } from '@/lib/site-settings-server';
import { getAvatarMap } from '@/lib/catalog-server';
import { AvatarMapProvider } from '@/components/avatar-map';

// Site public : direction « Comptoir de nuit » (voir site.css). Le back-office garde sa propre mise en page.
export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Pages coupées par l'admin : leurs liens disparaissent partout (le middleware, lui, renvoie la 404).
  const [{ off }, avatars] = await Promise.all([getSiteState(), getAvatarMap()]);
  return (
    <SitePagesProvider off={off}>
    <AvatarMapProvider avatars={avatars}>
    <div className="kp">
      <div className="k-bg" aria-hidden="true">
        <span className="k-glow k-glow-blue" />
        <span className="k-glow k-glow-coral" />
        <span className="k-glow k-glow-violet" />
      </div>
      <SiteHeader />
      <div className="k-main" id="contenu">{children}</div>
      <SiteFooter />
      <SiteEffects />
    </div>
    </AvatarMapProvider>
    </SitePagesProvider>
  );
}
