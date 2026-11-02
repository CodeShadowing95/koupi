'use client';
// Bouton « Relier les chaînes YouTube » : relie d'un coup la chaîne des créateurs venus de YouTube, puis dit ce qui reste à faire.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Report = { linked: string[]; skipped: { creator: string; reason: string }[] };

export function LinkChannelsButton({ missing, youtubeReady }: { missing: number; youtubeReady: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  async function run() {
    setBusy(true);
    setError('');
    setReport(null);
    try {
      const response = await fetch('/api/admin/creators/link-youtube', { method: 'POST' });
      const body = await response.json().catch(() => ({})) as Partial<Report> & { error?: string };
      if (!response.ok) setError(body.error || 'La liaison a échoué.');
      else { setReport({ linked: body.linked ?? [], skipped: body.skipped ?? [] }); router.refresh(); }
    } catch {
      setError('La liaison a échoué. Vérifie ta connexion.');
    }
    setBusy(false);
  }

  return (
    <>
      <button type="button" className="adm-btn" disabled={busy || missing === 0 || !youtubeReady} onClick={run}
        title={!youtubeReady ? 'La clé YouTube (YOUTUBE_API_KEY) manque' : missing === 0 ? 'Tous les créateurs ont déjà une chaîne YouTube reliée' : 'Retrouve la chaîne de chaque créateur à partir des vidéos sources de ses codes'}>
        {busy ? 'Lecture de YouTube…' : `Relier les chaînes YouTube${missing ? ` (${missing})` : ''}`}
      </button>
      {(report || error) && (
        <div className="adm-link-report" role="status">
          {error ? <div className="notice notice-error">{error}<button type="button" className="adm-btn" onClick={() => setError('')}>Fermer</button></div> : report && (
            <div className="notice">
              <b>{report.linked.length === 0 ? 'Aucune chaîne reliée.' : `${report.linked.length} chaîne${report.linked.length > 1 ? 's' : ''} reliée${report.linked.length > 1 ? 's' : ''}.`}</b>
              {' '}Elles ne sont pas encore contrôlées : coche « J’ai contrôlé ce compte » après un coup d’œil.
              {report.skipped.length > 0 && (
                <details>
                  <summary>{report.skipped.length} créateur{report.skipped.length > 1 ? 's' : ''} à relier à la main</summary>
                  <ul>{report.skipped.map(item => <li key={item.creator}><b>{item.creator}</b> : {item.reason}</li>)}</ul>
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
