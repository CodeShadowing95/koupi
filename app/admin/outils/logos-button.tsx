'use client';
// Logos des outils enregistrés dans Merkod (ADR-0027) : Logo.dev si sa clé est définie, sinon l'icône du site de la marque.
// « Récupérer les logos » : ceux qui manquent, par lots de 20 enchaînés. « Actualiser le logo » : un outil qui a changé de logo.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { plural } from '@/lib/creator-accounts-display';

type Report = { updated: string[]; failed: { tool: string; reason: string }[] };
type Batch = Partial<Report> & { remaining?: number; error?: string };

function useLogoRefresh() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  async function call(body: object): Promise<Batch | null> {
    const response = await fetch('/api/admin/tools/logos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({})) as Batch;
    if (!response.ok) { setError(data.error || 'La récupération a échoué.'); return null; }
    return data;
  }
  async function run(toolId?: string) {
    setBusy(true);
    setError('');
    setReport(null);
    setProgress(0);
    const total: Report = { updated: [], failed: [] };
    try {
      // Sans toolId : lot après lot, en passant les outils déjà tentés sans succès, jusqu'à ce qu'il n'en reste plus.
      for (let round = 0; round < 20; round++) {
        const batch = await call(toolId ? { toolId } : { skip: total.failed.length });
        if (!batch) break;
        total.updated.push(...(batch.updated ?? []));
        total.failed.push(...(batch.failed ?? []));
        setProgress(total.updated.length + total.failed.length);
        if (toolId || !batch.remaining) break;
      }
      setReport(total);
      if (total.updated.length) router.refresh();
    } catch {
      setError('La récupération a échoué. Vérifie ta connexion.');
    }
    setBusy(false);
  }
  return { busy, progress, report, error, run, close: () => { setReport(null); setError(''); } };
}

function ReportNotice({ report, error, close }: { report: Report | null; error: string; close: () => void }) {
  if (!report && !error) return null;
  return (
    <div className="adm-link-report" role="status">
      {error && <div className="notice notice-error">{error}<button type="button" className="adm-btn" onClick={close}>Fermer</button></div>}
      {!error && report && (
        <div className="notice">
          <b>{report.updated.length ? `${plural(report.updated.length, 'logo récupéré', 'logos récupérés')} : ${report.updated.join(', ')}.` : 'Aucun nouveau logo.'}</b>
          {report.failed.length > 0 && (
            <details>
              <summary>{plural(report.failed.length, 'logo introuvable', 'logos introuvables')}</summary>
              <ul>{report.failed.map(item => <li key={item.tool}><b>{item.tool}</b> : {item.reason}</li>)}</ul>
            </details>
          )}
          <button type="button" className="adm-btn" onClick={close}>Fermer</button>
        </div>
      )}
    </div>
  );
}

/** En haut de la page Outils : récupère les logos qui manquent encore en base. */
export function FetchLogosButton({ missing }: { missing: number }) {
  const { busy, progress, report, error, run, close } = useLogoRefresh();
  return (
    <>
      <button type="button" className="adm-btn" disabled={busy || missing === 0} onClick={() => run()}
        title={missing === 0 ? 'Tous les outils suivis ont leur logo' : 'Enregistre le logo de chaque outil qui n’en a pas encore'}>
        {busy ? `Récupération… ${progress}/${missing}` : `Récupérer les logos${missing ? ` (${missing})` : ''}`}
      </button>
      <ReportNotice report={report} error={error} close={close} />
    </>
  );
}

/** Dans le détail d'un outil : reprend son logo actuel (après un changement de marque ou de site). */
export function RefreshLogoButton({ toolId }: { toolId: string }) {
  const { busy, report, error, run, close } = useLogoRefresh();
  return (
    <>
      <button type="button" className="adm-btn" disabled={busy} onClick={() => run(toolId)} title="Reprend le logo actuel de la marque">
        {busy ? 'Récupération…' : 'Actualiser le logo'}
      </button>
      <ReportNotice report={report} error={error} close={close} />
    </>
  );
}
