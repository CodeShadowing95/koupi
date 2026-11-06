// Onglet « Vitesse » de Statistiques : la vitesse ressentie par les vrais visiteurs (ADR-0038),
// par type de page et par appareil, avec le même verdict que Google (75 % de visites bonnes).
import { getDb } from '@/db';
import { CORE_VITALS, MIN_SAMPLES, vitalsReport, type VitalCell, type VitalPage, type VitalVerdict } from '@/lib/web-vitals';

const PAGE_LABELS: Record<VitalPage, string> = {
  home: 'Accueil', codes: 'Codes', tool: 'Fiches outils', creator: 'Pages créateurs', creators: 'Liste des créateurs', category: 'Catégories', other: 'Autres pages',
};
const METRIC_LABELS: Record<string, string> = { LCP: 'Affichage', INP: 'Réactivité', CLS: 'Stabilité' };
const VERDICTS: Record<VitalVerdict, { label: string; className: string }> = {
  good: { label: 'Rapide', className: 'adm-pill adm-pill-ok' },
  'needs-improvement': { label: 'À améliorer', className: 'adm-pill adm-pill-warn' },
  poor: { label: 'Lent', className: 'adm-pill adm-pill-bad' },
  unknown: { label: 'Pas assez de visites', className: 'adm-pill' },
};

const share = (cell: VitalCell) => (cell.total ? `${Math.round(cell.goodShare * 100)} %` : '—');

export async function SpeedTab() {
  const report = await vitalsReport(getDb());
  return (
    <>
      <p className="adm-tab-intro">Ce que les visiteurs ressentent vraiment, mesuré par leur navigateur sur les {report.days} derniers jours. Pour chaque mesure, la part des visites jugées bonnes ; une page est <b>rapide</b> quand au moins 75 % des visites le sont sur les trois mesures, comme le juge Google. Aucun identifiant n’est gardé : seulement des totaux par jour.</p>
      {report.rows.length === 0 ? (
        <section className="adm-panel"><p className="adm-panel-sub">Pas encore de mesure. Les chiffres arrivent dès les premières visites sur le site en production.</p></section>
      ) : (
        <section className="adm-panel">
          <div className="adm-panel-head"><h2>Vitesse par page</h2><span className="adm-panel-sub">{report.samples.toLocaleString('fr-FR')} pages vues mesurées · verdict à partir de {MIN_SAMPLES} visites</span></div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th scope="col">Page</th><th scope="col">Appareil</th>{CORE_VITALS.map(metric => <th key={metric} scope="col">{METRIC_LABELS[metric]} <small>({metric})</small></th>)}<th scope="col">Verdict</th></tr></thead>
              <tbody>
                {report.rows.map(row => (
                  <tr key={`${row.page}-${row.device}`}>
                    <th scope="row">{PAGE_LABELS[row.page]}</th>
                    <td>{row.device === 'mobile' ? 'Mobile' : 'Ordinateur'}</td>
                    {CORE_VITALS.map(metric => {
                      const cell = row.metrics[metric];
                      return <td key={metric} title={`${cell.good} bonnes, ${cell.needs} à améliorer, ${cell.poor} mauvaises`}>{share(cell)} <span className={VERDICTS[cell.verdict].className}>{VERDICTS[cell.verdict].label}</span></td>;
                    })}
                    <td><span className={VERDICTS[row.verdict].className}>{VERDICTS[row.verdict].label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="adm-panel-sub"><b>Affichage</b> : le temps avant que le plus gros élément apparaisse (bon sous 2,5 s). <b>Réactivité</b> : le délai entre un clic et la réponse de la page (bon sous 200 ms). <b>Stabilité</b> : les sauts de mise en page pendant le chargement (bon sous 0,1). Commence par le mobile : c’est là que les visiteurs partent le plus vite.</p>
        </section>
      )}
    </>
  );
}
