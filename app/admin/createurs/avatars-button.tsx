'use client';
// Photos des créateurs depuis leur chaîne YouTube reliée, sinon la pochette de leur podcast (ADR-0027).
// « Récupérer les photos » : celles qui manquent, d'un coup. « Actualiser la photo » : un créateur qui a changé d'avatar.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { plural } from '@/lib/creator-accounts-display';

type Report = { updated: string[]; failed: { creator: string; reason: string }[] };

function useAvatarRefresh() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  async function run(creatorId?: string) {
    setBusy(true);
    setError('');
    setReport(null);
    try {
      const response = await fetch('/api/admin/creators/avatars', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(creatorId ? { creatorId } : {}) });
      const body = await response.json().catch(() => ({})) as Partial<Report> & { error?: string };
      if (!response.ok) setError(body.error || 'La récupération a échoué.');
      else { setReport({ updated: body.updated ?? [], failed: body.failed ?? [] }); router.refresh(); }
    } catch {
      setError('La récupération a échoué. Vérifie ta connexion.');
    }
    setBusy(false);
  }
  return { busy, report, error, run, close: () => { setReport(null); setError(''); } };
}

function ReportNotice({ report, error, close }: { report: Report | null; error: string; close: () => void }) {
  if (!report && !error) return null;
  return (
    <div className="adm-link-report" role="status">
      {error ? <div className="notice notice-error">{error}<button type="button" className="adm-btn" onClick={close}>Fermer</button></div> : report && (
        <div className="notice">
          <b>{report.updated.length ? `${plural(report.updated.length, 'photo récupérée', 'photos récupérées')} : ${report.updated.join(', ')}.` : 'Aucune nouvelle photo.'}</b>
          {report.failed.length > 0 && (
            <details>
              <summary>{plural(report.failed.length, 'photo manquante', 'photos manquantes')}</summary>
              <ul>{report.failed.map(item => <li key={item.creator}><b>{item.creator}</b> : {item.reason}</li>)}</ul>
            </details>
          )}
          <button type="button" className="adm-btn" onClick={close}>Fermer</button>
        </div>
      )}
    </div>
  );
}

/** En haut de la page Créateurs : récupère les photos de ceux qui ont une chaîne ou un podcast relié mais pas encore de photo. */
export function FetchAvatarsButton({ missing, youtubeReady }: { missing: number; youtubeReady: boolean }) {
  const { busy, report, error, run, close } = useAvatarRefresh();
  // Rien à récupérer : soit chaque compte relié a déjà sa photo, soit aucun créateur n'a encore de chaîne ou de podcast relié.
  const title = missing === 0 ? 'Aucune photo à récupérer. Relie d’abord une chaîne ou un podcast aux créateurs qui n’ont pas de photo.'
    : youtubeReady ? 'Récupère la photo de leur chaîne YouTube, ou la pochette de leur podcast'
    : 'Récupère la pochette de leur podcast (les chaînes YouTube demandent YOUTUBE_API_KEY)';
  return (
    <>
      <button type="button" className="adm-btn" disabled={busy || missing === 0} onClick={() => run()} title={title}>
        {busy ? 'Récupération…' : `Récupérer les photos${missing ? ` (${missing})` : ''}`}
      </button>
      <ReportNotice report={report} error={error} close={close} />
    </>
  );
}

/** Dans le détail d'un créateur : reprend la photo actuelle de sa chaîne, ou la pochette de son podcast. */
export function RefreshAvatarButton({ creatorId, source, youtubeReady }: { creatorId: string; source: 'youtube' | 'podcast' | null; youtubeReady: boolean }) {
  const { busy, report, error, run, close } = useAvatarRefresh();
  const blocked = source === null || (source === 'youtube' && !youtubeReady);
  const title = source === null ? 'Relie d’abord sa chaîne YouTube ou son podcast'
    : source === 'podcast' ? 'Reprend la pochette actuelle de son podcast'
    : youtubeReady ? 'Reprend la photo actuelle de sa chaîne YouTube' : 'Ajoute YOUTUBE_API_KEY pour récupérer les photos';
  return (
    <>
      <button type="button" className="adm-btn" disabled={busy || blocked} onClick={() => run(creatorId)} title={title}>
        {busy ? 'Récupération…' : 'Actualiser la photo'}
      </button>
      <ReportNotice report={report} error={error} close={close} />
    </>
  );
}
