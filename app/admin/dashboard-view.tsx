'use client';
// Accueil du back-office : ce qu'il faut faire aujourd'hui, le parcours des codes et les indicateurs clés,
// chacun avec son objectif et une phrase qui explique pourquoi il compte.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Catalog } from '@/lib/data';
import { coverageByCategory, overview, TARGETS, todos } from '@/lib/admin-stats';
import type { Insights } from '@/lib/admin-insights';
import type { Audience } from '@/lib/audience';
import { SUBMISSIONS_CHANGED } from './pending-count';


const actionLabel: Record<string, string> = { approved: 'validée', rejected: 'refusée', duplicate: 'marquée en doublon', new: 'remise à traiter' };
const codeActionLabel: Record<string, string> = { create: 'ajouté', edit: 'modifié', verify: 'vérifié : il marche', reject: 'rejeté : il ne marche pas', to_test: 'publié à tester', pending: 'mis en attente', archive: 'archivé', restore: 'restauré' };
const dotStatus: Record<string, string> = { verified: 'approved', to_test: 'new', pending: 'new' };

function useInsights() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const load = () => fetch('/api/admin/insights?period=30')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body: Insights) => { setInsights(body); setFailed(false); })
      .catch(() => setFailed(true));
    void load();
    window.addEventListener(SUBMISSIONS_CHANGED, load);
    return () => window.removeEventListener(SUBMISSIONS_CHANGED, load);
  }, []);
  return { insights, failed };
}

function useAudience() {
  const [audience, setAudience] = useState<Audience | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch('/api/admin/audience?period=7')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body: Audience) => setAudience(body))
      .catch(() => setFailed(true));
  }, []);
  return { audience, audienceFailed: failed };
}

function Kpi({ label, value, detail, rate, target, targetLabel, tone, note, children }: {
  label: string; value: string; detail: string; rate: number | null; target: number | null; targetLabel: string; tone: 'ok' | 'bad' | 'neutral'; note?: string; children: React.ReactNode;
}) {
  return (
    <article className="adm-kpi">
      <span className="adm-kpi-label">{label}</span>
      <div className="adm-kpi-value"><strong>{value}</strong><span>{detail}</span></div>
      <div className="adm-track" role="img" aria-label={rate === null ? 'Pas encore de données' : `${rate} % sur un objectif de ${target}`}>
        <div style={{ width: `${Math.min(100, rate ?? 0)}%`, background: tone === 'bad' ? 'var(--badge)' : tone === 'ok' ? 'var(--st-ok)' : 'var(--chart-1)' }} />
        {target !== null && <div className="adm-kpi-target" style={{ left: `${Math.min(100, target)}%` }} title="Objectif" />}
      </div>
      <span className="adm-kpi-note" data-tone={tone === 'neutral' ? undefined : tone}>{note ?? targetLabel}</span>
      <p className="adm-learn" style={{ fontSize: 12 }}>{children}</p>
    </article>
  );
}

export function DashboardView({ catalog }: { catalog: Catalog }) {
  const stats = overview(catalog);
  const { audience, audienceFailed } = useAudience();
  const coverage = coverageByCategory(catalog.categories);
  const { insights, failed } = useInsights();
  const list = todos(catalog, insights?.pending ?? null);
  const delay = insights?.medianDelayHours ?? null;
  const verifiedOk = (stats.verifiedRate ?? 0) >= TARGETS.verified;
  const coverageOk = (stats.coverage ?? 0) >= TARGETS.coverage;
  const successOk = (stats.success.rate ?? 0) >= TARGETS.success;
  const pipeline = [
    { label: 'En attente', hint: 'pas publié', value: stats.counts.pending, color: 'var(--st-pending)' },
    { label: 'À tester', hint: 'visible', value: stats.counts.to_test, color: 'var(--st-test)' },
    { label: 'Vérifié', hint: 'visible', value: stats.counts.verified, color: 'var(--st-ok)' },
    { label: 'Rejeté', hint: 'masqué', value: stats.counts.rejected, color: 'var(--st-rejected)' },
  ];
  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head adm-hello">
          <div>
            <h1>Bonjour</h1>
            <p>{list.length === 0 ? 'Rien d’urgent aujourd’hui. Profite-en pour chercher de nouveaux créateurs.' : <>Aujourd’hui : <b>{list.length} action{list.length > 1 ? 's' : ''}</b> pour rendre le catalogue plus fiable. Commence par la première, elle a le plus d’impact.</>}</p>
          </div>
        </div>

        <div className="adm-row">
          <section className="adm-panel adm-span-2" aria-labelledby="todo-title" style={{ gap: 0 }}>
            <div className="adm-panel-head" style={{ marginBottom: 8 }}>
              <h2 id="todo-title">À faire maintenant <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({list.length})</span></h2>
              <span className="adm-panel-sub">Classé par impact</span>
            </div>
            {list.map((todo, index) => (
              <div className="adm-todo" key={todo.id}>
                <span className="adm-todo-n" data-tone={todo.tone}>{index + 1}</span>
                <div className="adm-todo-body"><b>{todo.title}</b><p>{todo.why}</p></div>
                <Link className={`adm-cta${index === 0 ? ' adm-cta-pri' : ''}`} href={todo.href}>{todo.cta}</Link>
              </div>
            ))}
            {insights && insights.pending === 0 && (
              <div className="adm-todo-done">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                Propositions des visiteurs : rien à traiter, la file est vide.
              </div>
            )}
            {failed && <p className="adm-panel-sub" style={{ paddingTop: 10 }}>La file des propositions n’a pas pu être lue.</p>}
          </section>

          <section className="adm-panel" aria-labelledby="pipeline-title">
            <h2 id="pipeline-title">Le parcours des {stats.total} codes</h2>
            <p className="adm-panel-sub" style={{ fontSize: 13 }}>Chaque code avance de haut en bas. Le but : en avoir le plus possible en « Vérifié ».</p>
            {pipeline.map(step => (
              <div className="adm-bar-row" key={step.label}>
                <div className="adm-bar-row-head"><span>{step.label} <span>· {step.hint}</span></span><b>{step.value}</b></div>
                <div className="adm-track"><div style={{ width: `${(step.value / Math.max(1, stats.total)) * 100}%`, background: step.color }} /></div>
              </div>
            ))}
            <Link href="/admin/guide" style={{ marginTop: 'auto', fontSize: 13, fontWeight: 600 }}>Comprendre la vie d’un code →</Link>
          </section>
        </div>

        <section aria-labelledby="kpi-title" style={{ marginTop: 24 }}>
          <div className="adm-panel-head" style={{ marginBottom: 12 }}>
            <h2 id="kpi-title" style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-body)', letterSpacing: 0 }}>Indicateurs clés</h2>
            <Link href="/admin/guide" style={{ fontSize: 13, fontWeight: 600 }}>Comment les lire ?</Link>
          </div>
          <div className="adm-row adm-row-4" style={{ marginTop: 0 }}>
            <Kpi label="Couverture du catalogue" value={`${stats.coverage ?? 0} %`} detail={`${stats.coveredTools} / ${stats.tracked} outils`} rate={stats.coverage} target={TARGETS.coverage}
              targetLabel={`Objectif lancement : ${TARGETS.coverage} %`} tone={coverageOk ? 'ok' : 'neutral'}>
              Part des outils suivis qui ont au moins un code visible. Un visiteur qui cherche un outil sans code repart les mains vides.
            </Kpi>
            <Kpi label="Codes vérifiés" value={`${stats.verifiedRate ?? 0} %`} detail={`${stats.counts.verified} / ${stats.visible} visibles`} rate={stats.verifiedRate} target={TARGETS.verified}
              targetLabel={`Objectif : ${TARGETS.verified} %`} tone={verifiedOk ? 'ok' : 'bad'} note={verifiedOk ? `Objectif de ${TARGETS.verified} % atteint` : `Sous l’objectif de ${TARGETS.verified} %`}>
              Ta promesse, c’est des codes qui marchent. Plus ce chiffre est haut, plus le site inspire confiance.
            </Kpi>
            <Kpi label="Réussite déclarée" value={stats.success.rate === null ? '–' : `${stats.success.rate} %`} detail={`${stats.success.votes} votes, ${stats.success.votedCodes} codes`} rate={stats.success.rate} target={TARGETS.success}
              targetLabel={`Objectif : au moins ${TARGETS.success} %`} tone={stats.success.rate === null ? 'neutral' : successOk ? 'ok' : 'bad'}>
              Votes « ça marche / ça ne marche pas » des visiteurs, pondérés par le nombre de votes de chaque code.
            </Kpi>
            <Kpi label="Délai de modération" value={delay === null ? '–' : `${delay < 1 ? '< 1' : Math.round(delay)} h`} detail="médiane, 30 jours" rate={delay === null ? null : Math.round((delay / (TARGETS.delayHours * 2)) * 100)} target={50}
              targetLabel={delay === null ? 'Aucune décision ces 30 derniers jours' : `Objectif : moins de ${TARGETS.delayHours} h`} tone={delay === null ? 'neutral' : delay <= TARGETS.delayHours ? 'ok' : 'bad'}>
              Temps entre une proposition reçue et ta décision. Répondre vite donne envie aux visiteurs de proposer d’autres codes.
            </Kpi>
          </div>
        </section>

        <div className="adm-row adm-row-2">
          <section className="adm-panel" aria-labelledby="categories-title">
            <div className="adm-panel-head"><h2 id="categories-title">Outils avec un code, par catégorie</h2><span className="adm-panel-sub">{stats.emptyCategories.length} catégorie{stats.emptyCategories.length > 1 ? 's' : ''} vide{stats.emptyCategories.length > 1 ? 's' : ''}</span></div>
            <div className="adm-cat-grid">
              {coverage.map(item => (
                <div key={item.slug} style={{ display: 'contents' }}>
                  <span className={item.covered === 0 ? 'adm-cat-empty' : undefined}>{item.name}</span>
                  <div className="adm-track" role="img" aria-label={`${item.covered} sur ${item.tracked}`}><div style={{ width: `${item.rate}%` }} /></div>
                  <span className={`adm-cat-n${item.covered === 0 ? ' adm-cat-empty' : ''}`}>{item.covered} / {item.tracked}</span>
                </div>
              ))}
            </div>
            <Link href="/admin/stats" style={{ fontSize: 13, fontWeight: 600 }}>Voir toutes les statistiques →</Link>
          </section>

          <section className="adm-panel" aria-labelledby="audience-title">
            <div className="adm-panel-head"><h2 id="audience-title">Audience</h2><span className="adm-panel-sub">7 derniers jours · anonyme</span></div>
            {audience ? (
              <>
                <div className="adm-mini-grid">
                  <div className="adm-mini"><b className="adm-mini-n">{audience.totals.copies}</b><b>Codes copiés</b><span>Le geste clé : un visiteur a trouvé ce qu’il cherchait.</span></div>
                  <div className="adm-mini"><b className="adm-mini-n">{audience.totals.opens}</b><b>Liens ouverts</b><span>Vers le créateur ou l’outil : ce que tu montreras aux marques.</span></div>
                  <div className="adm-mini"><b className="adm-mini-n">{audience.totals.emptySearches}</b><b>Recherches sans résultat</b><span>{audience.emptySearches[0] ? <>La plus demandée : « {audience.emptySearches[0].query} ».</> : 'Les outils que les gens veulent et que tu n’as pas.'}</span></div>
                  <div className="adm-mini"><b className="adm-mini-n">{audience.topCodes[0]?.code ?? '–'}</b><b>Code le plus copié</b><span>{audience.topCodes[0] ? `${audience.topCodes[0].tool}, ${audience.topCodes[0].copies} copie${audience.topCodes[0].copies > 1 ? 's' : ''}.` : 'Pas encore de copie cette semaine.'}</span></div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Des totaux par jour, sans cookie ni service tiers : on ne compte pas les visiteurs, pour tenir la promesse « zéro pistage ».</p>
              </>
            ) : <p className="adm-panel-sub">{audienceFailed ? 'L’audience n’a pas pu être chargée.' : 'Chargement…'}</p>}
            <Link href="/admin/stats#audience" style={{ fontSize: 13, fontWeight: 600 }}>Voir l’audience en détail →</Link>
          </section>
        </div>

        <div className="adm-row">
          <section className="adm-panel adm-span-2" aria-labelledby="activity-title" style={{ gap: 0 }}>
            <div className="adm-panel-head" style={{ marginBottom: 6 }}><h2 id="activity-title">Activité récente</h2><span className="adm-panel-sub">Propositions et codes</span></div>
            {insights?.recent.length ? insights.recent.map(item => (
              <div className="adm-activity" key={item.id}>
                <span className="dot" data-status={item.kind === 'code' ? dotStatus[item.nextStatus] ?? item.nextStatus : item.nextStatus} aria-hidden="true" />
                {item.kind === 'code'
                  ? <span>Code <b className="mono">{item.code}</b>{item.tool ? ` (${item.tool})` : ''} {codeActionLabel[item.action] ?? item.action}</span>
                  : <span>Proposition {item.code ? <b className="mono">{item.code}</b> : 'supprimée'}{item.tool ? ` (${item.tool})` : ''} {actionLabel[item.nextStatus] ?? item.nextStatus}</span>}
                <time dateTime={item.at}>{new Date(item.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</time>
              </div>
            )) : <p className="adm-panel-sub" style={{ paddingTop: 10, borderTop: '1px solid var(--line)' }}>{insights ? 'Aucune décision pour l’instant.' : 'Chargement…'}</p>}
            <Link href="/admin/propositions" style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>Toutes les propositions →</Link>
          </section>
          <aside className="adm-tip" aria-labelledby="tip-title">
            <span>Le conseil du jour</span>
            <h2 id="tip-title">Un code testé vaut mieux que dix codes trouvés.</h2>
            <p>Les sites de codes promo perdent leurs visiteurs à cause des codes morts. Ta différence, c’est la vérification : 10 minutes de tests par jour suffisent pour faire grimper « Codes vérifiés ».</p>
            <Link href="/admin/guide">Lire le guide de l’admin →</Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
