'use client';
// Statistiques du back-office : état du catalogue, couverture, outils, fiabilité et propositions par semaine.
// Chaque graphique a une vue tableau et se termine par ce qu'il apprend à l'admin.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BarChart, ChartCard, Legend, type Series } from '@/components/admin-charts';
import type { Catalog } from '@/lib/data';
import { coverageByCategory, overview, reliabilityBuckets, topTools } from '@/lib/admin-stats';
import { PERIODS, type Insights, type Period } from '@/lib/admin-insights';
import { AUDIENCE_PERIODS, type Audience, type AudiencePeriod } from '@/lib/audience';

const weeklyKeys = [
  { key: 'approved', label: 'Validées', color: '--st-ok' },
  { key: 'closed', label: 'Refusées ou doublons', color: '--st-rejected' },
  { key: 'pending', label: 'À traiter', color: '--st-test' },
] as const;
const periodLabel: Record<Period, string> = { 7: '7 jours', 30: '30 jours', 90: '90 jours', 365: '12 mois' };

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

const audienceKeys = [
  { key: 'copies', label: 'Codes copiés', color: '--chart-1' },
  { key: 'opens', label: 'Liens ouverts', color: '--chart-2' },
] as const;

/** Audience anonyme : totaux par jour, sans cookie ni service tiers (lib/audience.ts). */
function AudienceSection() {
  const [period, setPeriod] = useState<AudiencePeriod>(30);
  const [audience, setAudience] = useState<Audience | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    fetch(`/api/admin/audience?period=${period}`)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body: Audience) => { if (active) setAudience(body); })
      .catch(() => { if (active) setError('L’audience n’a pas pu être chargée.'); });
    return () => { active = false; };
  }, [period]);

  const daily = audience?.daily ?? [];
  const labels = useMemo(() => daily.map(day => shortDate(day.day)), [daily]);
  const series = useMemo<Series[]>(() => audienceKeys.map(item => ({ label: item.label, color: item.color, data: daily.map(day => day[item.key]) })), [daily]);
  const topLabels = useMemo(() => (audience?.topCodes ?? []).map(item => `${item.code} · ${item.tool}`), [audience]);
  const topSeries = useMemo<Series[]>(() => [{ label: 'Copies', color: '--chart-1', data: (audience?.topCodes ?? []).map(item => item.copies) }], [audience]);
  const switcher = <div className="adm-period" role="group" aria-label="Période de l’audience">{AUDIENCE_PERIODS.map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>{value} jours</button>)}</div>;
  const empty = (text: string) => <div className="adm-chart-empty">{error || (!audience ? 'Chargement…' : text)}</div>;

  return (
    <>
      <div className="adm-head" style={{ marginTop: 32 }} id="audience">
        <div>
          <span className="eyebrow">Audience · anonyme</span>
          <h2 style={{ fontSize: 26 }}>Ce que font les visiteurs</h2>
          <p>De simples totaux par jour, comptés dans notre base : pas de cookie, pas de service tiers, aucun visiteur reconnaissable. On ne compte donc pas les « visiteurs », seulement les gestes utiles.</p>
        </div>
        {switcher}
      </div>
      <div className="adm-row adm-row-4" style={{ marginTop: 0 }}>
        <div className="adm-stat-tile"><span>Codes copiés</span><strong>{audience?.totals.copies ?? '–'}</strong><span>sur {period} jours</span></div>
        <div className="adm-stat-tile"><span>Liens ouverts</span><strong>{audience?.totals.opens ?? '–'}</strong><span>vers le créateur ou l’outil</span></div>
        <div className="adm-stat-tile"><span>Recherches sans résultat</span><strong>{audience?.totals.emptySearches ?? '–'}</strong><span>outils demandés, pas suivis</span></div>
        <div className="adm-stat-tile"><span>Copies → ouvertures</span><strong>{audience && audience.totals.copies ? `${Math.round((audience.totals.opens / audience.totals.copies) * 100)} %` : '–'}</strong><span>des copies mènent au lien</span></div>
      </div>
      <div className="adm-row adm-row-2" style={{ gridTemplateColumns: '1fr' }}>
        <ChartCard id="audience-daily" title="Copies et liens ouverts par jour"
          table={{ head: ['Jour', ...audienceKeys.map(item => item.label)], rows: daily.map(day => [shortDate(day.day), day.copies, day.opens]) }}
          learn="Une copie, c’est un visiteur qui a trouvé un code. Si les copies montent après l’ajout de codes vérifiés, ton travail de modération paie.">
          {!audience || error || audience.totals.copies + audience.totals.opens === 0
            ? empty('Pas encore de copie sur cette période. Les chiffres apparaîtront dès que des visiteurs copieront des codes.')
            : <><BarChart labels={labels} series={series} summary={daily.map(day => `${shortDate(day.day)} : ${day.copies} copies, ${day.opens} liens ouverts`).join('. ')} /><Legend series={series} /></>}
        </ChartCard>
      </div>
      <div className="adm-row adm-row-2">
        <ChartCard id="audience-codes" title="Codes les plus copiés" sub={`Sur ${period} jours`}
          table={{ head: ['Code', 'Outil', 'Copies'], rows: (audience?.topCodes ?? []).map(item => [item.code, item.tool, item.copies]) }}
          learn="Les codes les plus copiés méritent d’être testés en priorité : s’ils ne marchent plus, beaucoup de monde est déçu.">
          {audience && audience.topCodes.length > 0
            ? <BarChart className="adm-chart adm-chart-tall" horizontal labels={topLabels} series={topSeries} summary={(audience.topCodes).map(item => `${item.code} ${item.copies}`).join(', ')} />
            : empty('Aucun code copié sur cette période.')}
        </ChartCard>
        <section className="adm-panel" aria-labelledby="audience-searches">
          <div className="adm-panel-head"><h2 id="audience-searches">Recherches sans résultat</h2><span className="adm-panel-sub">Sur {period} jours</span></div>
          {audience && audience.emptySearches.length > 0 ? (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th scope="col">Recherche</th><th scope="col">Fois</th></tr></thead>
                <tbody>{audience.emptySearches.map(item => <tr key={item.query}><td>{item.query}</td><td>{item.count}</td></tr>)}</tbody>
              </table>
            </div>
          ) : empty('Aucune recherche sans résultat : les visiteurs trouvent ce qu’ils cherchent.')}
          <p className="adm-learn"><b>Ce que ça t’apprend :</b> chaque recherche vide est un outil que les gens veulent. Le plus demandé est ton prochain outil à suivre.</p>
        </section>
      </div>
    </>
  );
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

        <AudienceSection />
      </div>
    </main>
  );
}
