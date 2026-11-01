'use client';
// Statistiques du back-office : état du catalogue, couverture, outils, fiabilité et propositions par semaine.
// Chaque graphique a une vue tableau et se termine par ce qu'il apprend à l'admin.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BarChart, ChartCard, Legend, type Series } from '@/components/admin-charts';
import type { Catalog } from '@/lib/data';
import { coverageByCategory, overview, reliabilityBuckets, topTools } from '@/lib/admin-stats';
import { PERIODS, type Insights, type Period } from '@/lib/admin-insights';

const weeklyKeys = [
  { key: 'approved', label: 'Validées', color: '--st-ok' },
  { key: 'closed', label: 'Refusées ou doublons', color: '--st-rejected' },
  { key: 'pending', label: 'À traiter', color: '--st-test' },
] as const;
const periodLabel: Record<Period, string> = { 7: '7 jours', 30: '30 jours', 90: '90 jours', 365: '12 mois' };

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function StatsView({ catalog }: { catalog: Catalog }) {
  const stats = overview(catalog);
  const coverage = coverageByCategory(catalog.categories);
  const top = topTools(catalog.codes, 8);
  const reliability = reliabilityBuckets(catalog.codes);
  const mostTracked = [...coverage].sort((a, b) => b.tracked - a.tracked)[0];

  const statusSeries: Series[] = [
    { label: 'En attente', data: [stats.counts.pending], color: '--st-pending' },
    { label: 'À tester', data: [stats.counts.to_test], color: '--st-test' },
    { label: 'Vérifié', data: [stats.counts.verified], color: '--st-ok' },
    { label: 'Rejeté', data: [stats.counts.rejected], color: '--st-rejected' },
  ];
  const statusLabels = ['Codes'];
  const coverageLabels = coverage.map(item => item.name);
  const coverageSeries: Series[] = [{ label: 'Couverture', data: coverage.map(item => item.rate), color: '--chart-1' }];
  const coverageFormat = (value: number, index: number) => `${value} % (${coverage[index].covered} / ${coverage[index].tracked} outils)`;
  const topLabels = top.map(item => item.tool);
  const topSeries: Series[] = [{ label: 'Codes visibles', data: top.map(item => item.count), color: '--chart-1' }];
  const reliabilityLabels = ['Moins de 50 %', '50 à 79 %', '80 % et plus'];
  const reliabilitySeries: Series[] = [{ label: 'Codes', data: [reliability.low, reliability.mid, reliability.high], color: '--chart-1' }];
  const [period, setPeriod] = useState<Period>(30);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    fetch(`/api/admin/insights?period=${period}`)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body: Insights) => { if (active) setInsights(body); })
      .catch(() => { if (active) setError('Les propositions n’ont pas pu être chargées.'); });
    return () => { active = false; };
  }, [period]);

  const weekly = insights?.weekly ?? [];
  const weeklyLabels = useMemo(() => weekly.map(week => shortDate(week.start)), [weekly]);
  const weeklySeries = useMemo<Series[]>(() => weeklyKeys.map(item => ({ label: item.label, color: item.color, data: weekly.map(week => week[item.key]) })), [weekly]);
  const weeklyTotal = weekly.reduce((sum, week) => sum + week.approved + week.closed + week.pending, 0);

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Pilotage</span>
            <h1>Statistiques</h1>
            <p>Comment le catalogue évolue et où concentrer tes efforts. Chaque graphique se termine par ce qu’il t’apprend.</p>
          </div>
        </div>

        <div className="adm-row adm-row-4" style={{ marginTop: 0 }}>
          <div className="adm-stat-tile"><span>Codes visibles</span><strong>{stats.visible}</strong><span>{stats.counts.verified} vérifiés, {stats.counts.to_test} à tester</span></div>
          <div className="adm-stat-tile"><span>Outils couverts</span><strong>{stats.coveredTools} <small>/ {stats.tracked}</small></strong><span>au moins un code visible</span></div>
          <div className="adm-stat-tile"><span>Créateurs crédités</span><strong>{stats.creators}</strong><span>avec un code visible</span></div>
          <div className="adm-stat-tile"><span>Votes des visiteurs</span><strong>{stats.success.votes}</strong><span>sur {stats.success.votedCodes} codes</span></div>
        </div>

        <div className="adm-row adm-row-2" style={{ gridTemplateColumns: '1fr' }}>
          <ChartCard id="status" title={`État des ${stats.total} codes`}
            table={{ head: ['Statut', 'Codes'], rows: statusSeries.map(item => [item.label, item.data[0]]) }}
            learn={<>{stats.counts.to_test} codes sont visibles sans avoir été testés, contre {stats.counts.verified} vérifiés. Les tester est ton plus gros levier de confiance.</>}>
            <BarChart className="adm-chart adm-chart-short" horizontal stacked labels={statusLabels} series={statusSeries} max={stats.total}
              summary={statusSeries.map(item => `${item.label} ${item.data[0]}`).join(', ')} />
            <Legend series={statusSeries} />
          </ChartCard>
        </div>

        <div className="adm-row adm-row-2">
          <ChartCard id="coverage" title="Couverture par catégorie" sub="Part des outils suivis qui ont un code visible"
            table={{ head: ['Catégorie', 'Couverture', 'Outils couverts', 'Outils suivis'], rows: coverage.map(item => [item.name, `${item.rate} %`, item.covered, item.tracked]) }}
            learn={mostTracked ? <>« {mostTracked.name} » est la catégorie la plus suivie ({mostTracked.tracked} outils) avec {mostTracked.covered} outil{mostTracked.covered > 1 ? 's' : ''} couvert{mostTracked.covered > 1 ? 's' : ''}. C’est là qu’un nouveau créateur à suivre rapporterait le plus.</> : 'Aucune catégorie pour l’instant.'}>
            <BarChart className="adm-chart adm-chart-tall" horizontal labels={coverageLabels} series={coverageSeries} max={100} format={coverageFormat}
              summary={coverage.map(item => `${item.name} ${item.rate} %`).join(', ')} />
          </ChartCard>

          <ChartCard id="tools" title="Outils avec le plus de codes visibles" sub={`Top ${top.length} sur ${stats.coveredTools} outils couverts`}
            table={{ head: ['Outil', 'Codes visibles'], rows: top.map(item => [item.tool, item.count]) }}
            learn="Plusieurs codes pour un même outil, c’est bien (le visiteur a le choix), mais un seul code vérifié vaut plus que quatre non testés.">
            <BarChart className="adm-chart adm-chart-tall" horizontal labels={topLabels} series={topSeries}
              summary={top.map(item => `${item.tool} ${item.count}`).join(', ')} />
          </ChartCard>
        </div>

        <div className="adm-row adm-row-2">
          <ChartCard id="weekly" title="Propositions reçues par semaine"
            sub={insights ? `${insights.received} reçue${insights.received > 1 ? 's' : ''} sur ${periodLabel[period]}` : undefined}
            badge={<div className="adm-period" role="group" aria-label="Période">{PERIODS.map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>{periodLabel[value]}</button>)}</div>}
            table={{ head: ['Semaine du', ...weeklyKeys.map(item => item.label)], rows: weekly.map(week => [shortDate(week.start), week.approved, week.closed, week.pending]) }}
            learn="Si l’orange grandit semaine après semaine, la file s’accumule. Si les barres montent, les visiteurs contribuent : bon signe pour la communauté.">
            {error ? <div className="adm-chart-empty" role="alert">{error}</div>
              : !insights ? <div className="adm-chart-empty">Chargement…</div>
              : weeklyTotal === 0 ? <div className="adm-chart-empty">Aucune proposition sur cette période. Le formulaire « Proposer un code » du site les fera apparaître ici.</div>
              : <><BarChart stacked labels={weeklyLabels} series={weeklySeries} summary={weekly.map(week => `Semaine du ${shortDate(week.start)} : ${week.approved} validées, ${week.closed} refusées, ${week.pending} à traiter`).join('. ')} /><Legend series={weeklySeries} /></>}
          </ChartCard>

          <ChartCard id="reliability" title="Fiabilité selon les votes" sub={`Codes par taux de réussite déclaré (${stats.success.votedCodes} codes votés)`}
            table={{ head: ['Taux de réussite', 'Codes'], rows: reliabilityLabels.map((label, index) => [label, reliabilitySeries[0].data[index]]) }}
            learn={reliability.low > 0
              ? <>{reliability.low} code{reliability.low > 1 ? 's' : ''} sous 50 % : {reliability.low > 1 ? 'ils sont' : 'il est'} dans ta liste « <Link href="/admin">À faire</Link> » s’il{reliability.low > 1 ? 's ont' : ' a'} au moins 2 votes.</>
              : 'Aucun code voté sous 50 % : les visiteurs trouvent des codes qui marchent.'}>
            <BarChart labels={reliabilityLabels} series={reliabilitySeries} summary={reliabilityLabels.map((label, index) => `${label} : ${reliabilitySeries[0].data[index]}`).join(', ')} />
          </ChartCard>
        </div>

        <section className="adm-panel adm-panel-dashed" aria-labelledby="audience" style={{ marginTop: 16 }}>
          <div className="adm-panel-head"><h2 id="audience">Audience du site</h2><span className="adm-soon">À brancher · compteurs anonymes</span></div>
          <div className="adm-row" style={{ marginTop: 0 }}>
            <div className="adm-mini"><b>Codes copiés par jour</b><span>Le visiteur a trouvé ce qu’il cherchait.</span></div>
            <div className="adm-mini"><b>Clics vers l’outil, par outil</b><span>Ce que tu montreras aux marques plus tard.</span></div>
            <div className="adm-mini"><b>Recherches sans résultat</b><span>Les prochains outils à suivre.</span></div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Ces graphiques arriveront avec des compteurs anonymes dans notre propre base, sans cookie ni service tiers, pour tenir la promesse « zéro pistage ».</p>
        </section>
      </div>
    </main>
  );
}
