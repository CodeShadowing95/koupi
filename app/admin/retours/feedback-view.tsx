'use client';
// Avis des visiteurs envoyés depuis la page « Ton avis » (ADR-0029). Chaque avis passe de Nouveau à Lu, puis Traité
// quand tu as répondu ou agi. Une note facultative t'aide à t'en souvenir.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS, type AdminFeedback, type FeedbackKind, type FeedbackStatus } from '@/lib/feedback';
import { sendJson } from '@/components/admin-form-dialog';
import { StatusDot } from '@/components/admin-card';
import { RefreshButton } from '@/components/admin-refresh-button';
import { parisDate } from '@/lib/paris-date';

type Filter = FeedbackStatus | 'all';
const filters: { value: Filter; label: string }[] = [
  { value: 'new', label: 'Nouveaux' }, { value: 'read', label: 'Lus' }, { value: 'done', label: 'Traités' }, { value: 'all', label: 'Tous' },
];
type KindFilter = FeedbackKind | '';
const TONE: Record<FeedbackKind, 'info' | 'ok' | 'warn'> = { remark: 'info', idea: 'ok', problem: 'warn' };
const dateFr = (iso: string) => parisDate(iso, { dateStyle: 'medium', timeStyle: 'short' });

export function FeedbackView({ items }: { items: AdminFeedback[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('new');
  const [kind, setKind] = useState<KindFilter>('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const ofKind = items.filter(item => !kind || item.kind === kind);
  const shown = ofKind.filter(item => filter === 'all' || item.status === filter);
  const countOf = (value: Filter) => ofKind.filter(item => value === 'all' || item.status === value).length;

  async function setStatus(item: AdminFeedback, status: FeedbackStatus) {
    setBusy(item.id);
    setError('');
    const note = notes[item.id];
    const failed = await sendJson(`/api/admin/feedback/${item.id}`, 'PATCH', note === undefined ? { status } : { status, adminNote: note });
    setBusy(null);
    if (failed) setError(failed); else router.refresh();
  }

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Pilotage</span>
            <h1>Retours des visiteurs</h1>
            <p>Les avis envoyés depuis la page <a href="/feedback" target="_blank" rel="noopener noreferrer">Ton avis</a> : remarques, idées et problèmes. Lis-les, réponds par e-mail quand une adresse est donnée, puis marque-les traités.</p>
          </div>
          <div className="adm-head-actions"><RefreshButton /></div>
        </div>
        <div className="adm-toolbar">
          <div className="adm-tabs" role="group" aria-label="Statut">
            {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
          </div>
          <div className="adm-filters" role="group" aria-label="Type">
            <button type="button" className="adm-filter" aria-pressed={!kind} onClick={() => setKind('')}>Tous les types</button>
            {(Object.keys(FEEDBACK_KIND_LABELS) as FeedbackKind[]).map(value => (
              <button key={value} type="button" className="adm-filter" aria-pressed={kind === value} onClick={() => setKind(kind === value ? '' : value)}>{FEEDBACK_KIND_LABELS[value]}</button>
            ))}
          </div>
        </div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {shown.length === 0 ? (
          <div className="adm-empty">{filter === 'new' ? 'Aucun nouvel avis. Tout est lu.' : 'Aucun avis ici.'}</div>
        ) : (
          <div className="adm-req-list">
            {shown.map(item => {
              const reply = item.email ? `mailto:${item.email}?subject=${encodeURIComponent('Ton avis sur Merkod')}` : null;
              return (
                <article className="adm-card adm-req" key={item.id}>
                  <div className="adm-card-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <StatusDot tone={TONE[item.kind]}>{FEEDBACK_KIND_LABELS[item.kind]}</StatusDot>
                      {item.fromPath && <a href={item.fromPath} target="_blank" rel="noopener noreferrer">Depuis {item.fromPath} ↗</a>}
                    </span>
                    <small className="muted">{dateFr(item.createdAt)} · {FEEDBACK_STATUS_LABELS[item.status]}{item.handledAt ? ` le ${dateFr(item.handledAt)}` : ''}</small>
                  </div>
                  <p className="adm-fb-message">{item.message}</p>
                  <dl className="adm-req-facts">
                    <dt>E-mail</dt><dd>{reply ? <a href={reply}>{item.email}</a> : <span className="muted">Non donné</span>}</dd>
                  </dl>
                  <div className="field">
                    <label htmlFor={`note-${item.id}`}>Note pour toi <span className="muted">(facultatif)</span></label>
                    <input id={`note-${item.id}`} maxLength={500} value={notes[item.id] ?? item.adminNote ?? ''} onChange={event => setNotes({ ...notes, [item.id]: event.target.value })} placeholder="Ex. Bonne idée, à prévoir après les alertes." />
                  </div>
                  <div className="adm-card-foot" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {reply && item.status !== 'done' && <a className="adm-btn" href={reply}>Répondre par e-mail</a>}
                    <span style={{ flex: 1 }} />
                    {item.status === 'new' && <button type="button" className="adm-btn" disabled={busy === item.id} onClick={() => setStatus(item, 'read')}>Marquer lu</button>}
                    {item.status !== 'done'
                      ? <button type="button" className="adm-btn adm-btn-pri" disabled={busy === item.id} onClick={() => setStatus(item, 'done')}>Marquer traité</button>
                      : <button type="button" className="adm-btn" disabled={busy === item.id} onClick={() => setStatus(item, 'new')}>Rouvrir</button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
