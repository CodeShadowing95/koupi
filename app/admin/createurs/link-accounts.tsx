'use client';
// Bouton « Relier les comptes » : relie d'un coup la chaîne YouTube ou le podcast des créateurs d'après les sources
// de leurs codes, puis dit, pour chaque créateur encore sans compte, d'où viennent ses codes.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { linkedSummary, plural, type LinkReport } from '@/lib/creator-accounts-display';

type Report = LinkReport;

export function LinkAccountsButton({ toLink, youtubeReady }: { toLink: number; youtubeReady: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  async function run() {
    setBusy(true);
    setError('');
    setReport(null);
    try {
      const response = await fetch('/api/admin/creators/link-accounts', { method: 'POST' });
      const body = await response.json().catch(() => ({})) as Partial<Report> & { error?: string };
      if (!response.ok) setError(body.error || 'La liaison a échoué.');
      else { setReport({ linked: body.linked ?? [], toLink: body.toLink ?? [] }); router.refresh(); }
    } catch {
      setError('La liaison a échoué. Vérifie ta connexion.');
    }
    setBusy(false);
  }

  const title = toLink === 0
    ? 'Tous les créateurs ont déjà un compte relié'
    : `Retrouve la chaîne YouTube ou le podcast de chaque créateur à partir des sources de ses codes${youtubeReady ? '' : ' (sans clé YouTube : podcasts seulement)'}`;

  return (
    <>
      <button type="button" className="adm-btn" disabled={busy || toLink === 0} onClick={run} title={title}>
        {busy ? 'Lecture des sources…' : `Relier les comptes${toLink ? ` (${toLink})` : ''}`}
      </button>
      {(report || error) && (
        <div className="adm-link-report" role="status">
          {error ? <div className="notice notice-error">{error}<button type="button" className="adm-btn" onClick={() => setError('')}>Fermer</button></div> : report && (
            <div className="notice">
              <b>{linkedSummary(report.linked)}</b>
              {report.linked.length > 0 && <span>Ils ne sont pas encore contrôlés : coche « J’ai contrôlé ce compte » après un coup d’œil.</span>}
              {report.toLink.length > 0 && (
                <details>
                  <summary>{plural(report.toLink.length, 'créateur', 'créateurs')} à relier à la main</summary>
                  <ul>{report.toLink.map(item => <li key={item.creator}><b>{item.creator}</b> : {item.reason}</li>)}</ul>
                </details>
              )}
              <button type="button" className="adm-btn" onClick={() => { setReport(null); setError(''); }}>Fermer</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
