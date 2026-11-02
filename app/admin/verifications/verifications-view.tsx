'use client';
// Page Vérifications : la file des codes à décider, chacun avec son analyse (score, raisons, extrait de la source).
// L'admin garde la décision : Valider (source vérifiée), Testé au paiement, ou Rejeter. Raccourcis J/K, A, V, T, R.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AiStatus } from '@/lib/ai-extract';
import { VERDICT_LABELS, formatUsd, highlightCode, modelLabel, verdictOf, type QueueItem, type Verdict } from '@/lib/verification-display';
import { matchesSearch } from '@/lib/admin-search';
import { Key } from '@/components/admin-guide';

type Ai = { status: AiStatus; spentUsdMicros: number; budgetUsdMicros: number; model: string; reviewModel: string };
type Filter = 'all' | Verdict;
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'clear', label: 'Dossiers clairs' },
  { value: 'doubt', label: 'À regarder' },
  { value: 'reject', label: 'Rejet proposé' },
  { value: 'none', label: 'Pas analysés' },
];
const verdictClass: Record<Verdict, string> = { clear: 'is-ok', doubt: 'is-warn', reject: 'is-bad', none: 'is-none' };
const statusLabel: Record<QueueItem['status'], string> = { pending: 'En attente', to_test: 'À tester' };
const dateTime = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

type Decision = 'verify' | 'payment_test' | 'reject';
const decisionDone: Record<Decision, string> = { verify: 'validé', payment_test: 'validé et testé au paiement', reject: 'rejeté' };

function AiBanner({ ai, youtubeReady }: { ai: Ai; youtubeReady: boolean }) {
  const { status } = ai;
  const percent = ai.budgetUsdMicros > 0 ? Math.min(100, Math.round((ai.spentUsdMicros / ai.budgetUsdMicros) * 100)) : 0;
  const tone = status.state === 'active' ? 'is-ok' : status.state === 'budget_reached' ? 'is-bad' : 'is-none';
  return (
    <section className="adm-vf-ai" aria-label="État de l’IA">
      <div className="adm-vf-ai-state">
        <span className={`adm-vf-dot ${tone}`} aria-hidden="true" />
        <div>
          <b>{status.label}</b>
          <span>
            {status.state === 'inactive'
              ? 'Les contrôles automatiques marchent déjà. L’IA s’allumera dès que la clé ANTHROPIC_API_KEY sera ajoutée dans les réglages Vercel.'
              : `${modelLabel(ai.model)} lit chaque description, ${modelLabel(ai.reviewModel)} relit les dossiers douteux.`}
          </span>
        </div>
      </div>
      <div className="adm-vf-budget">
        <div className="adm-vf-budget-row"><span>Dépense du mois</span><b>{formatUsd(ai.spentUsdMicros)} <small>sur {formatUsd(ai.budgetUsdMicros)}</small></b></div>
        <div className="adm-vf-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Part du plafond mensuel dépensée"><span style={{ width: `${percent}%` }} /></div>
      </div>
      {!youtubeReady && <p className="adm-vf-ai-warn">La clé YOUTUBE_API_KEY manque sur ce déploiement : les sources YouTube ne peuvent pas être lues, ouvre-les toi-même.</p>}
    </section>
  );
}

function Evidence({ excerpt, code }: { excerpt: string; code: string }) {
  return <blockquote className="adm-vf-evidence">{highlightCode(excerpt, code).map((part, index) => part.match ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>)}</blockquote>;
}

export function VerificationsView({ queue, ai, youtubeReady }: { queue: QueueItem[]; ai: Ai; youtubeReady: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string>('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(0);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const stopBatch = useRef(false);
  const cards = useRef<(HTMLElement | null)[]>([]);

  const countOf = (value: Filter) => value === 'all' ? queue.length : queue.filter(item => verdictOf(item.check) === value).length;
  const visible = queue.filter(item => (filter === 'all' || verdictOf(item.check) === filter)
    && matchesSearch([item.code, item.tool, item.creator, item.discount, item.sourceTitle], query));
  const current = visible[Math.min(selected, visible.length - 1)] ?? null;
  const unanalyzed = queue.filter(item => !item.check);
  const aiActive = ai.status.state === 'active';

  const analyze = useCallback(async (item: QueueItem, mode: 'standard' | 'review' = 'standard') => {
    const response = await fetch(`/api/admin/verifications/${item.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode }) }).catch(() => null);
    return Boolean(response?.ok);
  }, []);

  const runOne = useCallback(async (item: QueueItem, mode: 'standard' | 'review' = 'standard') => {
    setBusy(item.id);
    const ok = await analyze(item, mode);
    setMessage(ok ? `${item.code} : analyse terminée.` : `${item.code} : l’analyse n’a pas pu se faire. Réessaie dans un instant.`);
    setBusy('');
    router.refresh();
  }, [analyze, router]);

  const decide = useCallback(async (item: QueueItem, action: Decision) => {
    setBusy(item.id);
    const response = await fetch(`/api/admin/codes/${item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) }).catch(() => null);
    setMessage(response?.ok ? `${item.code} ${decisionDone[action]}.` : 'Le changement n’a pas pu être enregistré. Réessaie.');
    setBusy('');
    router.refresh();
  }, [router]);

  async function analyzeAll() {
    stopBatch.current = false;
    const list = [...unanalyzed];
    setBatch({ done: 0, total: list.length });
    let failed = 0;
    for (const [index, item] of list.entries()) {
      if (stopBatch.current) break;
      if (!(await analyze(item))) failed += 1;
      setBatch({ done: index + 1, total: list.length });
    }
    setBatch(null);
    setMessage(failed ? `Analyse terminée, ${failed} code${failed > 1 ? 's' : ''} n’${failed > 1 ? 'ont' : 'a'} pas pu être lu${failed > 1 ? 's' : ''}.` : 'Analyse terminée.');
    router.refresh();
  }

  // Raccourcis clavier : J/K pour passer d'un dossier à l'autre, A pour analyser, V/T/R pour décider.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], dialog[open]')) return;
      const key = event.key.toLowerCase();
      if (key === 'j' || key === 'k') {
        event.preventDefault();
        const next = Math.max(0, Math.min(visible.length - 1, selected + (key === 'j' ? 1 : -1)));
        setSelected(next);
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        cards.current[next]?.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
        return;
      }
      if (!current || busy || batch) return;
      const actions: Record<string, () => void> = {
        a: () => runOne(current),
        v: () => decide(current, 'verify'),
        t: () => decide(current, 'payment_test'),
        r: () => decide(current, 'reject'),
      };
      if (actions[key]) { event.preventDefault(); actions[key](); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible.length, selected, current, busy, batch, runOne, decide]);

  useEffect(() => { setSelected(0); }, [filter, query]);

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Modération</span>
            <h1>Vérifications</h1>
            <p>Koupi lit la source de chaque code, fait les contrôles et propose un score. Tu gardes la décision : valider, noter le test au paiement ou rejeter.</p>
          </div>
          <div className="adm-head-actions">
            {batch
              ? <button type="button" className="adm-btn" onClick={() => { stopBatch.current = true; }}>Arrêter ({batch.done}/{batch.total})</button>
              : <button type="button" className="adm-btn adm-btn-pri" disabled={unanalyzed.length === 0 || Boolean(busy)} onClick={analyzeAll}>{unanalyzed.length === 0 ? 'Tous les codes sont analysés' : unanalyzed.length === 1 ? 'Analyser le code non analysé' : `Analyser les ${unanalyzed.length} codes non analysés`}</button>}
          </div>
        </div>

        <AiBanner ai={ai} youtubeReady={youtubeReady} />

        <div className="adm-tabs" role="group" aria-label="Verdict">
          {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
        </div>
        <div className="adm-toolbar">
          <label htmlFor="vf-search" className="sr-only">Rechercher un code</label>
          <input id="vf-search" className="adm-search" type="search" placeholder="Rechercher un code, un outil, un créateur…" value={query} onChange={event => setQuery(event.target.value)} />
          <span className="adm-count">{visible.length} sur {countOf(filter)}</span>
          <span className="adm-vf-keys" aria-label="Raccourcis clavier"><Key>J</Key><Key>K</Key> naviguer · <Key>A</Key> analyser · <Key>V</Key> valider · <Key>T</Key> testé au paiement · <Key>R</Key> rejeter</span>
        </div>
        <p className="sr-only" role="status" aria-live="polite">{message}</p>
        {message && <p className="adm-hint" aria-hidden="true">{message}</p>}

        {visible.length === 0 ? (
          <div className="adm-empty">{queue.length === 0 ? 'Rien à vérifier : tous les codes ont une décision.' : 'Aucun code ne correspond à ce filtre.'}</div>
        ) : (
          <div className="adm-vf-list">
            {visible.map((item, index) => {
              const verdict = verdictOf(item.check);
              const isBusy = busy === item.id || Boolean(batch);
              return (
                <article key={item.id} ref={element => { cards.current[index] = element; }} className={`adm-vf-card${current?.id === item.id ? ' is-current' : ''}`} onClick={() => setSelected(index)}>
                  <header className="adm-vf-top">
                    <div className={`adm-vf-score ${verdictClass[verdict]}`} title={VERDICT_LABELS[verdict]}>
                      <b>{item.check ? item.check.score : '–'}</b><small>/100</small>
                    </div>
                    <div className="adm-vf-id">
                      <div className="adm-vf-title"><span className="mono">{item.code}</span><span className={`adm-vf-verdict ${verdictClass[verdict]}`}>{VERDICT_LABELS[verdict]}</span></div>
                      <p>{item.tool} · {item.discount} · par {item.creator} · <span className="adm-cell-muted">{statusLabel[item.status]}</span></p>
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}>{item.sourceTitle || 'Ouvrir la source'} ↗</a>
                    </div>
                  </header>

                  {item.check ? (
                    <div className="adm-vf-body">
                      {item.check.evidence && <Evidence excerpt={item.check.evidence} code={item.code} />}
                      <ul className="adm-vf-reasons">
                        {item.check.reasons.map((reason, reasonIndex) => (
                          <li key={reasonIndex}><span className={reason.points > 0 ? 'is-ok' : reason.points < 0 ? 'is-bad' : 'is-none'}>{reason.points > 0 ? `+${reason.points}` : reason.points < 0 ? reason.points : '·'}</span>{reason.label}</li>
                        ))}
                      </ul>
                      <p className="adm-vf-meta">Analysé le {dateTime(item.check.createdAt)}{item.check.model ? ` · lu par ${modelLabel(item.check.model)} · ${formatUsd(item.check.costUsdMicros)}` : ' · sans IA'}</p>
                    </div>
                  ) : (
                    <p className="adm-vf-meta">Pas encore analysé. « Analyser » lit la source et calcule le score.</p>
                  )}

                  <footer className="adm-vf-actions">
                    <button type="button" className="adm-btn" disabled={isBusy} onClick={() => runOne(item)}>{busy === item.id ? 'Analyse…' : item.check ? 'Réanalyser' : 'Analyser'}</button>
                    <button type="button" className="adm-btn" disabled={isBusy || !aiActive} title={aiActive ? 'Fait relire la source par le modèle le plus fin' : ai.status.label} onClick={() => runOne(item, 'review')}>Relire avec {modelLabel(ai.reviewModel)}</button>
                    <span className="adm-vf-push" />
                    <button type="button" className="adm-btn adm-btn-no" disabled={isBusy} onClick={() => decide(item, 'reject')}>✗ Rejeter</button>
                    <button type="button" className="adm-btn adm-btn-ok" disabled={isBusy} title="Tu as essayé le code jusqu’au paiement et la réduction s’applique" onClick={() => decide(item, 'payment_test')}>Testé au paiement</button>
                    <button type="button" className="adm-btn adm-btn-pri" disabled={isBusy} title="La source est vérifiée : le code est bien donné par le créateur" onClick={() => decide(item, 'verify')}>✓ Valider</button>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
