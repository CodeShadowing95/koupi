import './site.css';
import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { SiteEffects } from '@/components/site/effects';

// Site public : direction « Comptoir de nuit » (voir site.css). Le back-office garde sa propre mise en page.
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
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
  );
}
