'use client';
// Page Vérifications : la file des codes à décider, chacun avec son analyse (score, raisons, extrait de la source).
// L'admin garde la décision : Valider (source vérifiée), Testé au paiement, ou Rejeter. Raccourcis J/K, A, E, V, T, R.
// Le crayon à côté du code le corrige quand le repérage a pris le mauvais mot ; l'analyse est alors relancée.
import { LinkOfferTag } from '@/components/admin-link-offer-tag';
import { shortLink } from '@/lib/offer-link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pagination, usePagination } from '@/components/admin-pagination';
import { useRouter } from 'next/navigation';
import type { AiStatus } from '@/lib/ai-extract';
import { VERDICT_LABELS, formatEur, formatUsd, highlightCode, modelLabel, verdictOf, type QueueItem, type Verdict } from '@/lib/verification-display';
import { matchesSearch } from '@/lib/admin-search';
import { Key } from '@/components/admin-guide';
import { RETEST_DAYS } from '@/lib/admin-stats';
import { RefreshButton } from '@/components/admin-refresh-button';
import { CODE_ORIGIN_LABELS } from '@/lib/code-origin';
import { USAGE_CHANGED } from '@/components/admin-usage-gauge';
import { calendarDay, parisDate } from '@/lib/paris-date';
import { IconButton } from '@/components/admin-card';
import { FormDialog, sendJson } from '@/components/admin-form-dialog';
import { MAX_CODE_LENGTH } from '@/lib/code-format';
import type { PickerTool } from '@/lib/verification-display';
import { ToolPicker } from './tool-picker';

type Ai = { status: AiStatus; spentUsdMicros: number; budgetUsdMicros: number; usdPerEur: number; model: string; reviewModel: string };
type Filter = 'all' | Verdict | 'retest';
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'clear', label: 'Dossiers clairs' },
  { value: 'doubt', label: 'À regarder' },
  { value: 'reject', label: 'Rejet proposé' },
  { value: 'none', label: 'Pas analysés' },
  { value: 'retest', label: 'Retests' },
];
const verdictClass: Record<Verdict, string> = { clear: 'is-ok', doubt: 'is-warn', reject: 'is-bad', none: 'is-none' };
const statusLabel: Record<QueueItem['status'], string> = { pending: 'En attente', to_test: 'À tester', verified: 'Vérifié' };
const isRetest = (item: QueueItem) => item.status === 'verified';
const matchesFilter = (item: QueueItem, filter: Filter) => filter === 'retest' ? isRetest(item) : !isRetest(item) && (filter === 'all' || verdictOf(item.check) === filter);
const shortDay = (day: string) => calendarDay(day, { day: 'numeric', month: 'short', year: 'numeric' });
const dateTime = (iso: string) => parisDate(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

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
        <div className="adm-vf-budget-row"><span>Dépense du mois</span><b title={`${formatUsd(ai.spentUsdMicros)} sur ${formatUsd(ai.budgetUsdMicros)} facturés en dollars`}>{formatEur(ai.spentUsdMicros, ai.usdPerEur)} <small>sur {formatEur(ai.budgetUsdMicros, ai.usdPerEur)}</small></b></div>
        <div className="adm-vf-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Part du plafond mensuel dépensée"><span style={{ width: `${percent}%` }} /></div>
      </div>
      {!youtubeReady && <p className="adm-vf-ai-warn">La clé YOUTUBE_API_KEY manque sur ce déploiement : les sources YouTube ne peuvent pas être lues, ouvre-les toi-même.</p>}
    </section>
  );
}

/** Le nom d'une ligne dans les messages : son code, sinon son lien. */
const nameOf = (item: QueueItem) => item.code || 'L’offre par lien';

function Evidence({ excerpt, code }: { excerpt: string; code: string }) {
  return <blockquote className="adm-vf-evidence">{highlightCode(excerpt, code).map((part, index) => part.match ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>)}</blockquote>;
}

export function VerificationsView({ queue, ai, youtubeReady, tools }: { queue: QueueItem[]; ai: Ai; youtubeReady: boolean; tools: PickerTool[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string>('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(0);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const stopBatch = useRef(false);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const [editing, setEditing] = useState<QueueItem | null>(null);
  const [draft, setDraft] = useState({ code: '', discount: '' });
  const openEdit = useCallback((item: QueueItem) => { setDraft({ code: item.code, discount: item.discount }); setEditing(item); }, []);

  const countOf = (value: Filter) => queue.filter(item => matchesFilter(item, value)).length;
  const visible = queue.filter(item => matchesFilter(item, filter)
    && matchesSearch([item.code, item.tool, item.creator, item.discount, item.sourceTitle], query));
  const current = visible[Math.min(selected, visible.length - 1)] ?? null;
  // 24 dossiers par page, comme les autres listes : selected reste la position dans toute la liste filtrée.
  const { current: page, goTo, topRef, size, changeSize } = usePagination(visible, `${filter}|${query}`);
  const unanalyzed = queue.filter(item => !item.check && !isRetest(item));
  const aiActive = ai.status.state === 'active';

  const analyze = useCallback(async (item: QueueItem, mode: 'standard' | 'review' = 'standard') => {
    const response = await fetch(`/api/admin/verifications/${item.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode }) }).catch(() => null);
    window.dispatchEvent(new Event(USAGE_CHANGED)); // l'analyse lit YouTube et l'IA : la jauge du menu se met à jour
    return Boolean(response?.ok);
  }, []);

  const runOne = useCallback(async (item: QueueItem, mode: 'standard' | 'review' = 'standard') => {
    setBusy(item.id);
    const ok = await analyze(item, mode);
    setMessage(ok ? `${nameOf(item)} : analyse terminée.` : `${nameOf(item)} : l’analyse n’a pas pu se faire. Réessaie dans un instant.`);
    setBusy('');
    router.refresh();
  }, [analyze, router]);

  const decide = useCallback(async (item: QueueItem, action: Decision) => {
    setBusy(item.id);
    const response = await fetch(`/api/admin/codes/${item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) }).catch(() => null);
    setMessage(response?.ok ? `${nameOf(item)} ${decisionDone[action]}.` : 'Le changement n’a pas pu être enregistré. Réessaie.');
    setBusy('');
    router.refresh();
  }, [router]);

  async function saveCorrection(): Promise<string | null> {
    if (!editing) return null;
    const failure = await sendJson(`/api/admin/codes/${editing.id}`, 'PATCH', { correct: draft });
    if (failure) return failure;
    // Le code a changé : l'ancienne analyse ne vaut plus, on relit la source avec le bon code.
    void runOne({ ...editing, code: draft.code.trim().toUpperCase() });
    return null;
  }

  async function retestNow() {
    setBusy('retest');
    const response = await fetch('/api/admin/verifications/retest', { method: 'POST' }).catch(() => null);
    const body = response?.ok ? await response.json() as { checked: number } : null;
    setMessage(body ? (body.checked === 0 ? 'Aucun code vérifié à relire pour l’instant.' : `${body.checked} code${body.checked > 1 ? 's' : ''} vérifié${body.checked > 1 ? 's' : ''} relu${body.checked > 1 ? 's' : ''}. Ceux qui posent problème apparaissent ici.`) : 'Les retests n’ont pas pu se lancer. Réessaie dans un instant.');
    setBusy('');
    router.refresh();
  }

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
        const nextPage = Math.floor(next / size) + 1;
        if (nextPage !== page.page) { goTo(nextPage); return; }
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        cards.current[next]?.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
        return;
      }
      if (!current || busy || batch) return;
      const actions: Record<string, () => void> = {
        a: () => runOne(current),
        e: () => openEdit(current),
        v: () => decide(current, 'verify'),
        t: () => decide(current, 'payment_test'),
        r: () => decide(current, 'reject'),
      };
      if (actions[key]) { event.preventDefault(); actions[key](); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible.length, selected, current, busy, batch, runOne, decide, openEdit, size, page.page, goTo]);

  useEffect(() => { setSelected(0); }, [filter, query]);
  // Le message s'efface seul après 8 secondes.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 8000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h1>Vérifications</h1>
            <p>Merkod lit la source de chaque code, fait les contrôles et propose un score. Tu gardes la décision : valider, noter le test au paiement ou rejeter.</p>
          </div>
          <div className="adm-head-actions">
            <RefreshButton />
            {batch
              ? <button type="button" className="adm-btn" onClick={() => { stopBatch.current = true; }}>Arrêter ({batch.done}/{batch.total})</button>
              : <button type="button" className="adm-btn adm-btn-pri" disabled={unanalyzed.length === 0 || Boolean(busy)} onClick={analyzeAll}>{unanalyzed.length === 0 ? 'Tous les codes sont analysés' : unanalyzed.length === 1 ? 'Analyser le code non analysé' : `Analyser les ${unanalyzed.length} codes non analysés`}</button>}
          </div>
        </div>

        <AiBanner ai={ai} youtubeReady={youtubeReady} />

        <div className="adm-tabs" role="group" aria-label="Verdict">
          {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} {item.value === 'retest' && countOf('retest') > 0 && filter !== 'retest' ? <span className="adm-count-badge">{countOf('retest')}</span> : <span className="adm-tab-n">{countOf(item.value)}</span>}</button>)}
        </div>
        <div className="adm-toolbar">
          <label htmlFor="vf-search" className="sr-only">Rechercher un code</label>
          <input id="vf-search" className="adm-search" type="search" placeholder="Rechercher un code, un outil, un créateur…" value={query} onChange={event => setQuery(event.target.value)} />
          <span className="adm-count">{visible.length} sur {countOf(filter)}</span>
          <span className="adm-vf-keys" aria-label="Raccourcis clavier"><Key>J</Key><Key>K</Key> naviguer · <Key>A</Key> analyser · <Key>E</Key> corriger · <Key>V</Key> valider · <Key>T</Key> testé au paiement · <Key>R</Key> rejeter</span>
        </div>
        {filter === 'retest' && (
          <div className="adm-hint adm-vf-retest-hint">
            <span>Chaque nuit, Merkod relit la source des codes vérifiés depuis plus de {RETEST_DAYS} jours. Ceux dont l’analyse n’est plus claire arrivent ici : la source a peut-être disparu ou le code n’y figure plus. « Valider » confirme le code et le retire de la liste.</span>
            <button type="button" className="adm-btn" disabled={Boolean(busy) || Boolean(batch)} onClick={retestNow}>{busy === 'retest' ? 'Retests en cours…' : 'Lancer les retests maintenant'}</button>
          </div>
        )}
        {/* Message fixe en bas de l'écran : il reste visible quand on agit sur un dossier plus bas dans la page. */}
        <div className={`adm-toast${message ? ' is-on' : ''}`} role="status" aria-live="polite">
          {message && <><span>{message}</span><button type="button" className="adm-toast-close" aria-label="Fermer le message" onClick={() => setMessage('')}>×</button></>}
        </div>

        {visible.length === 0 ? (
          <div className="adm-empty">{filter === 'retest' && !query ? 'Aucun code vérifié ne pose problème.' : queue.length === 0 ? 'Rien à vérifier : tous les codes ont une décision.' : 'Aucun code ne correspond à ce filtre.'}</div>
        ) : (
          <>
          <div ref={topRef} className="adm-list-top" />
          <div className="adm-vf-list">
            {page.items.map((item, pageIndex) => {
              const index = page.from - 1 + pageIndex;
              const verdict = verdictOf(item.check);
              const isBusy = busy === item.id || Boolean(batch);
              return (
                <article key={item.id} ref={element => { cards.current[index] = element; }} className={`adm-vf-card${current?.id === item.id ? ' is-current' : ''}`} onClick={() => setSelected(index)}>
                  <header className="adm-vf-top">
                    <div className={`adm-vf-score ${verdictClass[verdict]}`} title={VERDICT_LABELS[verdict]}>
                      <b>{item.check ? item.check.score : '–'}</b><small>/100</small>
                    </div>
                    <div className="adm-vf-id">
                      <div className="adm-vf-title">{item.code ? <span className="mono">{item.code}</span> : <LinkOfferTag />}<IconButton icon="edit" label={item.code ? `Corriger le code ${item.code}` : 'Ajouter un code à cette offre'} disabled={isBusy} onClick={() => openEdit(item)} /><span className={`adm-vf-verdict ${verdictClass[verdict]}`}>{VERDICT_LABELS[verdict]}</span></div>
                      <p>{item.tool} · {item.discount} · par {item.creator} · <span className="adm-cell-muted">{statusLabel[item.status]} · {CODE_ORIGIN_LABELS[item.origin]}</span></p>
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}>{item.sourceTitle || 'Ouvrir la source'} ↗</a>
                      {item.offerLink && <a className="adm-vf-offer" href={item.offerLink} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}>Lien de l’offre : {shortLink(item.offerLink)} ↗</a>}
                      {item.expiresOn && !item.expired && <span className="adm-vf-expiry">Valable jusqu’au {shortDay(item.expiresOn)}</span>}
                    </div>
                  </header>

                  {item.expired && item.expiresOn && <p className="adm-vf-ai-warn">La date de fin donnée par le créateur ({shortDay(item.expiresOn)}) est passée. Essaie le code : s’il marche encore, « Valider » le confirme et retire la date passée. Sinon, rejette-le.</p>}
                  {item.check ? (
                    <div className="adm-vf-body">
                      {item.check.evidence && <Evidence excerpt={item.check.evidence} code={item.code || shortLink(item.offerLink ?? '')} />}
                      {item.check.aiCodes.length > 0 && (
                        <p className="adm-vf-fix">
                          <span>L’IA lit plutôt</span>
                          {item.check.aiCodes.map(code => <button key={code} type="button" className="adm-vf-chip" disabled={isBusy} title={`Corriger le code en ${code}`} onClick={event => { event.stopPropagation(); setDraft({ code, discount: item.discount }); setEditing(item); }}><span className="mono">{code}</span> · utiliser</button>)}
                        </p>
                      )}
                      {item.check.aiTool && (
                        <ToolPicker key={`${item.id}-${item.toolSlug}`} codeId={item.id} currentSlug={item.toolSlug} currentName={item.tool} aiTool={item.check.aiTool} tools={tools} disabled={isBusy}
                          onMoved={toolName => { setMessage(`${nameOf(item)} : rattaché à ${toolName}. Nouvelle analyse…`); void runOne({ ...item, tool: toolName }); }} />
                      )}
                      <ul className="adm-vf-reasons">
                        {item.check.reasons.map((reason, reasonIndex) => (
                          <li key={reasonIndex}><span className={reason.points > 0 ? 'is-ok' : reason.points < 0 ? 'is-bad' : 'is-none'}>{reason.points > 0 ? `+${reason.points}` : reason.points < 0 ? reason.points : '·'}</span>{reason.label}</li>
                        ))}
                      </ul>
                      <p className="adm-vf-meta">Analysé le {dateTime(item.check.createdAt)}{item.check.model ? ` · lu par ${modelLabel(item.check.model)} · ${formatEur(item.check.costUsdMicros, ai.usdPerEur)}` : ' · sans IA'}</p>
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
          <FormDialog open={editing !== null} title={editing?.code ? `Corriger le code ${editing.code}` : 'Ajouter un code à l’offre par lien'} submitLabel="Corriger et réanalyser"
            intro="Quand le repérage a pris le mauvais mot, écris ici le code tel qu’il est donné dans la source. L’analyse est relancée avec le bon code."
            onClose={() => setEditing(null)} onSubmit={saveCorrection}>
            {editing?.check?.evidence && <div className="adm-span-2"><Evidence excerpt={editing.check.evidence} code={editing.code || shortLink(editing.offerLink ?? '')} /></div>}
            <div className="field adm-span-2">
              <label htmlFor="vf-fix-code">Code promo</label>
              <input id="vf-fix-code" className="mono" value={draft.code} onChange={event => setDraft(value => ({ ...value, code: event.target.value }))} required maxLength={MAX_CODE_LENGTH} autoComplete="off" spellCheck={false} />
              {editing?.check && editing.check.aiCodes.length > 0 && (
                <span className="adm-vf-fix">
                  <span>Lu par l’IA :</span>
                  {editing.check.aiCodes.map(code => <button key={code} type="button" className="adm-vf-chip" aria-pressed={draft.code.trim().toUpperCase() === code} onClick={() => setDraft(value => ({ ...value, code }))}><span className="mono">{code}</span></button>)}
                </span>
              )}
            </div>
            <div className="field adm-span-2">
              <label htmlFor="vf-fix-discount">Réduction</label>
              <input id="vf-fix-discount" value={draft.discount} onChange={event => setDraft(value => ({ ...value, discount: event.target.value }))} required maxLength={240} placeholder="Ex. -20 % la première année" />
            </div>
          </FormDialog>
          <Pagination current={page} onChange={next => { goTo(next); setSelected((next - 1) * size); }} label="codes" size={size} onSizeChange={changeSize} />
          </>
        )}
      </div>
    </main>
  );
}
