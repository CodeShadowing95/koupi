'use client';
// « Actualiser les comptes » : relit l'audience, le pays et la langue des chaînes et des podcasts reliés.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { plural } from '@/lib/creator-accounts-display';
import type { AccountsRefreshReport } from '@/lib/accounts-refresh';

export function RefreshAccountsButton({ accounts }: { accounts: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<AccountsRefreshReport | null>(null);
  const [error, setError] = useState('');
  async function run() {
    setBusy(true);
    setError('');
    setReport(null);
    try {
      const response = await fetch('/api/admin/creators/refresh-accounts', { method: 'POST' });
      const body = await response.json().catch(() => ({})) as Partial<AccountsRefreshReport> & { error?: string };
      if (!response.ok) setError(body.error || 'L’actualisation a échoué.');
      else { setReport({ youtube: body.youtube ?? 0, podcasts: body.podcasts ?? 0, podcastsLeft: body.podcastsLeft ?? 0, failed: body.failed ?? [], youtubeReady: body.youtubeReady ?? false }); router.refresh(); }
    } catch {
      setError('L’actualisation a échoué. Vérifie ta connexion.');
    }
    setBusy(false);
  }
  const close = () => { setReport(null); setError(''); };
  return (
    <>
      <button type="button" className="adm-btn" disabled={busy || accounts === 0} onClick={run}
        title={accounts === 0 ? 'Aucune chaîne ni aucun podcast relié' : 'Relit abonnés, note, épisodes, pays et langue des chaînes YouTube et des podcasts reliés'}>
        {busy ? 'Actualisation…' : 'Actualiser les comptes'}
      </button>
      {(report || error) && (
        <div className="adm-link-report" role="status">
          {error ? <div className="notice notice-error">{error}<button type="button" className="adm-btn" onClick={close}>Fermer</button></div> : report && (
            <div className="notice">
              <b>{plural(report.youtube, 'chaîne relue', 'chaînes relues')}, {plural(report.podcasts, 'podcast relu', 'podcasts relus')}.</b>
              {!report.youtubeReady && <p>Les chaînes YouTube demandent la clé YOUTUBE_API_KEY.</p>}
              {report.podcastsLeft > 0 && <p>Encore {plural(report.podcastsLeft, 'podcast', 'podcasts')} à relire : reclique pour continuer.</p>}
              {report.failed.length > 0 && (
                <details>
                  <summary>{plural(report.failed.length, 'compte non relu', 'comptes non relus')}</summary>
                  <ul>{report.failed.map(item => <li key={`${item.creator}-${item.reason}`}><b>{item.creator}</b> : {item.reason}</li>)}</ul>
                </details>
              )}
              <button type="button" className="adm-btn" onClick={close}>Fermer</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
