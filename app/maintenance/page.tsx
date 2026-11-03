import type { Metadata } from 'next';
import '@/app/(site)/site.css';

// Page montrée à la place de tout le site quand l'admin le met en pause (middleware.ts, statut 503).
// Sans en-tête ni liens : rien n'est accessible pendant la pause, sauf l'admin.
export const metadata: Metadata = { title: 'Koupi revient vite', robots: { index: false, follow: false } };

export default function Maintenance() {
  return (
    <div className="kp">
      <div className="k-bg" aria-hidden="true"><span className="k-glow k-glow-blue" /><span className="k-glow k-glow-coral" /><span className="k-glow k-glow-violet" /></div>
      <main className="k-page k-main k-maintenance" id="contenu">
        <div className="k-wrap k-page-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="k-maintenance-logo" src="/koupi-logo-dark.png" alt="Koupi" width={1100} height={480} />
          <span className="k-eyebrow">Pause</span>
          <h1>On range le comptoir.</h1>
          <p>Koupi fait une courte pause pour une mise à jour. Les codes des créateurs reviennent dans quelques instants.</p>
        </div>
      </main>
    </div>
  );
}
