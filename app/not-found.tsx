import Link from 'next/link';
import '@/app/(site)/site.css';
import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';

export default function NotFound() {
  return (
    <div className="kp">
      <div className="k-bg" aria-hidden="true"><span className="k-glow k-glow-blue" /><span className="k-glow k-glow-coral" /></div>
      <SiteHeader />
      <main className="k-page k-main" id="contenu">
        <div className="k-wrap k-page-head">
          <span className="k-eyebrow">Erreur 404</span>
          <h1>Ce ticket ne mène nulle part.</h1>
          <p>La page n&apos;existe pas ou plus. Cherche un outil depuis l&apos;accueil.</p>
          <Link className="k-btn k-btn-paper k-btn-ticket" href="/" style={{ alignSelf: 'flex-start' }}>Retour à l&apos;accueil</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
