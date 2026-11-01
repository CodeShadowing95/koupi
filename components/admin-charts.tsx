'use client';
// Graphiques de la page Statistiques, avec Chart.js (seulement les morceaux utilisés, chargés sur cette page).
// Les couleurs viennent des variables CSS du thème : le graphique se redessine au passage clair / sombre.
import { useEffect, useRef, useState } from 'react';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip, type ChartConfiguration } from 'chart.js';
import { cssVar, useAdminTheme } from '@/components/admin-theme';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export type Series = { label: string; data: number[]; color: string };

type Props = {
  labels: string[];
  series: Series[];
  /** Barres horizontales (catégories, outils) ou verticales (semaines, tranches). */
  horizontal?: boolean;
  stacked?: boolean;
  max?: number;
  /** Texte du nombre dans l'infobulle, ex. (v) => `${v} %`. */
  format?: (value: number, index: number, series: Series) => string;
  /** Résumé lu par les lecteurs d'écran. */
  summary: string;
  className?: string;
};

function resolve(color: string): string {
  return color.startsWith('--') ? cssVar(color) || '#888' : color;
}

export function BarChart({ labels, series, horizontal = false, stacked = false, max, format, summary, className = 'adm-chart' }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useAdminTheme();
  useEffect(() => {
    if (!canvas.current) return;
    const text = cssVar('--muted');
    const grid = cssVar('--chart-grid');
    const surface = cssVar('--card');
    const valueAxis = { beginAtZero: true, max, grid: { color: grid }, border: { display: false }, ticks: { color: text, precision: 0, font: { size: 11 } }, stacked };
    const categoryAxis = { grid: { display: false }, border: { color: grid }, ticks: { color: cssVar('--ink-soft'), font: { size: 12 } }, stacked };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: series.map(item => ({
          label: item.label, data: item.data,
          backgroundColor: resolve(item.color), hoverBackgroundColor: resolve(item.color),
          borderColor: surface, borderWidth: stacked ? 1 : 0, borderRadius: 4, borderSkipped: stacked ? false : 'start',
          maxBarThickness: horizontal ? 16 : 36, categoryPercentage: 0.7, barPercentage: 0.9,
        })),
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true, maintainAspectRatio: false,
        animation: reduce ? false : { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        scales: horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: cssVar('--ink'), titleColor: cssVar('--on-ink'), bodyColor: cssVar('--on-ink'),
            padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
            callbacks: { label: context => ` ${context.dataset.label} : ${format ? format(context.parsed[horizontal ? 'x' : 'y'] ?? 0, context.dataIndex, series[context.datasetIndex]) : context.formattedValue}` },
          },
        },
      },
    };
    const chart = new Chart(canvas.current, config);
    return () => chart.destroy();
  }, [labels, series, horizontal, stacked, max, format, theme]);
  return <div className={className}><canvas ref={canvas} role="img" aria-label={summary} /></div>;
}

/** Légende : toujours présente à partir de deux séries, l'identité ne repose jamais sur la couleur seule. */
export function Legend({ series }: { series: Pick<Series, 'label' | 'color'>[] }) {
  return (
    <div className="adm-legend">
      {series.map(item => <span key={item.label}><i style={{ background: item.color.startsWith('--') ? `var(${item.color})` : item.color }} />{item.label}</span>)}
    </div>
  );
}

/** Carte de graphique avec sa vue tableau (pour lire les valeurs exactes, ou sans la couleur). */
export function ChartCard({ id, title, sub, badge, table, learn, children }: {
  id: string; title: string; sub?: string; badge?: React.ReactNode; table: { head: string[]; rows: (string | number)[][] }; learn: React.ReactNode; children: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="adm-panel" aria-labelledby={id}>
      <div className="adm-panel-head">
        <h2 id={id}>{title}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {badge}
          <button type="button" className="adm-link-btn" aria-pressed={asTable} onClick={() => setAsTable(value => !value)}>{asTable ? 'Voir le graphique' : 'Voir en tableau'}</button>
        </div>
      </div>
      {sub && <span className="adm-panel-sub" style={{ marginTop: -8 }}>{sub}</span>}
      {asTable ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr>{table.head.map(cell => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
            <tbody>{table.rows.map(row => <tr key={String(row[0])}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : children}
      <p className="adm-learn"><b>Ce que ça t’apprend :</b> {learn}</p>
    </section>
  );
}
