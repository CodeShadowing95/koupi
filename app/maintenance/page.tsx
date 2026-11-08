import type { Metadata } from 'next';
import '@/app/(site)/site.css';
import { SiteLogo } from '@/components/site/site-logo';

// Page montrée à la place de tout le site quand l'admin le met en pause (middleware.ts, statut 503).
// Sans en-tête ni liens : rien n'est accessible pendant la pause, sauf l'admin.
export const metadata: Metadata = { title: 'Merkod revient vite', robots: { index: false, follow: false } };

export default function Maintenance() {
  return (
    <div className="kp">
      <main className="k-page k-main k-maintenance" id="contenu">
        <div className="k-wrap k-page-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <SiteLogo className="k-maintenance-logo" />
          <span className="k-eyebrow">Pause</span>
          <h1>On range le comptoir.</h1>
          <p>Merkod fait une courte pause pour une mise à jour. Les codes des créateurs reviennent dans quelques instants.</p>
        </div>
      </main>
    </div>
  );
}
