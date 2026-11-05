'use client';
// Onglet « Sources et outils » de Statistiques : le rendement de chaque source sur 30 jours,
// puis ce que les visiteurs copient vraiment, par outil et par catégorie.
import Link from 'next/link';
import { BarChart, ChartCard, Legend, type Series } from '@/components/admin-charts';
import { sourceLesson, STATS_DAYS, type SourceStats } from '@/lib/source-groups';

const yieldKeys = [
  { key: 'found', label: 'Trouvés', color: '--chart-2' },
  { key: 'published', label: 'Publiés', color: '--st-ok' },
  { key: 'copies', label: 'Copiés', color: '--chart-1' },
] as const;

const number = (value: number) => value.toLocaleString('fr-FR');
const share = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

export function SourcesTab({ stats }: { stats: SourceStats }) {
  const found = stats.sources.reduce((sum, item) => sum + item.found, 0);
  const published = stats.sources.reduce((sum, item) => sum + item.published, 0);
  const labels = stats.sources.map(item => item.label);
  const series: Series[] = yieldKeys.map(item => ({ label: item.label, color: item.color, data: stats.sources.map(source => source[item.key]) }));
  const topTool = stats.tools[0];
  const topCategory = stats.categories[0];
  const toolShare = topTool ? share(topTool.copies, stats.totalCopies) : 0;

  return (
    <>
      <p className="adm-tab-intro">Sur les {STATS_DAYS} derniers jours : ce que chaque source a trouvé, ce que tu as publié, puis ce que les visiteurs ont vraiment copié. Les visiteurs ne voient jamais ces chiffres.</p>

      <div className="adm-row adm-row-4" style={{ marginTop: 0 }}>
        <div className="adm-stat-tile"><span>Codes trouvés</span><strong>{number(found)}</strong><span>ajoutés en {STATS_DAYS} jours</span></div>
        <div className="adm-stat-tile"><span>Codes publiés</span><strong>{number(published)}</strong><span>{share(published, found)} % des codes trouvés</span></div>
        <div className="adm-stat-tile"><span>Copies</span><strong>{number(stats.totalCopies)}</strong><span>tous codes confondus</span></div>
        <div className="adm-stat-tile"><span>Outil le plus copié</span><strong className="adm-stat-name">{topTool ? topTool.name : '–'}</strong><span>{topTool ? `${toolShare} % des copies` : 'aucune copie pour l’instant'}</span></div>
      </div>

      <div className="adm-row adm-row-2" style={{ gridTemplateColumns: '1fr' }}>
        <ChartCard id="yield" title="Rendement par source" sub={`Trouvés et publiés : codes ajoutés en ${STATS_DAYS} jours. Copiés : copies en ${STATS_DAYS} jours de tous les codes de la source.`}
          table={{ head: ['Source', 'Trouvés', 'Publiés', 'Copiés'], rows: stats.sources.map(item => [item.label, item.found, item.published, item.copies]) }}
          learn={sourceLesson(stats.sources)}>
          <Legend series={series} />
          <BarChart className="adm-chart adm-chart-tall" horizontal labels={labels} series={series}
            summary={stats.sources.map(item => `${item.label} : ${item.found} trouvés, ${item.published} publiés, ${item.copies} copiés`).join(' ; ')} />
        </ChartCard>
      </div>

      <div className="adm-row adm-row-2">
        <ChartCard id="copies-tools" title="Copies par outil" sub={stats.tools.length ? `Les ${stats.tools.length} outils les plus copiés` : undefined}
          table={{ head: ['Outil', 'Copies'], rows: stats.tools.map(item => [item.name, item.copies]) }}
          learn={topTool
            ? <>« <Link href={`/admin/codes?q=${encodeURIComponent(topTool.name)}`}>{topTool.name}</Link> » fait {toolShare} % des copies. Garde toujours un code vérifié pour les outils du haut : c’est là qu’un code mort déçoit le plus de monde.</>
            : 'Aucune copie sur la période : les chiffres viendront avec les premiers visiteurs.'}>
          {stats.tools.length ? (
            <BarChart className="adm-chart adm-chart-tall" horizontal labels={stats.tools.map(item => item.name)}
              series={[{ label: 'Copies', color: '--chart-1', data: stats.tools.map(item => item.copies) }]}
              summary={stats.tools.map(item => `${item.name} ${item.copies}`).join(', ')} />
          ) : <div className="adm-chart-empty">Aucune copie sur {STATS_DAYS} jours.</div>}
        </ChartCard>

        <ChartCard id="copies-categories" title="Copies par catégorie" sub="Ce que les visiteurs viennent chercher"
          table={{ head: ['Catégorie', 'Copies'], rows: stats.categories.map(item => [item.name, item.copies]) }}
          learn={topCategory
            ? <>« {topCategory.name} » est ce que les visiteurs veulent le plus. Ajoute des outils et suis des créateurs dans cette catégorie avant les autres.</>
            : 'Aucune copie sur la période.'}>
          {stats.categories.length ? (
            <BarChart className="adm-chart adm-chart-tall" horizontal labels={stats.categories.map(item => item.name)}
              series={[{ label: 'Copies', color: '--chart-1', data: stats.categories.map(item => item.copies) }]}
              summary={stats.categories.map(item => `${item.name} ${item.copies}`).join(', ')} />
          ) : <div className="adm-chart-empty">Aucune copie sur {STATS_DAYS} jours.</div>}
        </ChartCard>
      </div>
    </>
  );
}
