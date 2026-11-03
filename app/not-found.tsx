import Link from 'next/link';
import '@/app/(site)/site.css';
import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { PageHead } from '@/components/site/page-head';

export default function NotFound() {
  return (
    <div className="kp">
      <div className="k-bg" aria-hidden="true"><span className="k-glow k-glow-blue" /><span className="k-glow k-glow-coral" /></div>
      <SiteHeader />
      <main className="k-page k-main" id="contenu">
        <div className="k-wrap">
          <PageHead eyebrow="Erreur 404" title="Ce ticket ne mène nulle part." lead="La page n'existe pas ou plus. Cherche un outil depuis l'accueil.">
            <Link className="k-btn k-btn-paper k-btn-ticket k-self-start" href="/">Retour à l&apos;accueil</Link>
          </PageHead>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
