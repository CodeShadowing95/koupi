'use client';
import { useEffect, useState } from 'react';
import { categories } from '@/lib/data';
import { matchesSearch } from '@/lib/admin-search';
import { SUBMISSIONS_CHANGED } from '../pending-count';
type Submission = { id: string; tool_name: string; creator_name: string; code: string; discount_label: string; source_url: string; creator_link: string | null; comment: string | null; submitter_email: string | null; status: string; admin_note: string | null; created_at: string };
export default function Propositions() {
  const [items, setItems] = useState<Submission[]>([]);
  const [status, setStatus] = useState('new');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  async function load(nextStatus = status, nextCategory = category, nextFrom = from, nextTo = to) {
    setLoading(true); setError('');
    const params = new URLSearchParams({ status: nextStatus });
    if (nextCategory) params.set('category', nextCategory);
    if (nextFrom) params.set('from', nextFrom);
    if (nextTo) params.set('to', nextTo);
    const response = await fetch(`/api/admin/submissions?${params.toString()}`);
    const body = await response.json() as { submissions?: Submission[]; error?: string };
    if (!response.ok) { setError(body.error || 'Impossible de charger la file.'); setLoading(false); return; }
    setItems(body.submissions || []); setLoading(false);
  }
  useEffect(() => { void load(); }, [status, category, from, to]);
  async function decide(id: string, action: string) {
    const note = action === 'reject' ? window.prompt('Note de refus (facultative)') || '' : action === 'approve' ? window.prompt('Note de validation (facultative)') || '' : '';
    const response = await fetch('/api/admin/submissions', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, action, note }) });
    if (!response.ok) { setError('La décision n’a pas pu être enregistrée.'); return; }
    await load();
    window.dispatchEvent(new Event(SUBMISSIONS_CHANGED));
  }
  function resetFilters() { setCategory(''); setFrom(''); setTo(''); }
  const statusPill: Record<string, string> = { new: 'adm-pill', duplicate: 'adm-pill adm-pill-warn', approved: 'adm-pill adm-pill-ok', rejected: 'adm-pill adm-pill-bad' };
  const statusName: Record<string, string> = { new: 'À traiter', duplicate: 'Doublon', approved: 'Validée', rejected: 'Refusée' };
  const visible = items.filter(item => matchesSearch([item.code, item.tool_name, item.creator_name, item.discount_label, item.comment, item.submitter_email], query));
  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Modération</span>
            <h1>Propositions</h1>
            <p>Vérifie la source et décide ce qui peut entrer dans le catalogue public.</p>
          </div>
        </div>
        <div className="adm-toolbar">
          <div className="adm-filters">
            {['new', 'duplicate', 'approved', 'rejected', 'all'].map(option => <button key={option} type="button" className="adm-filter" aria-pressed={status === option} onClick={() => setStatus(option)}>{option === 'new' ? 'À traiter' : option === 'duplicate' ? 'Doublons' : option === 'approved' ? 'Validées' : option === 'rejected' ? 'Refusées' : 'Toutes'}</button>)}
          </div>
        </div>
        <div className="adm-toolbar">
          <label htmlFor="proposal-search" className="sr-only">Rechercher une proposition</label>
          <input id="proposal-search" className="adm-search" type="search" placeholder="Rechercher un code, un outil, un créateur, un e-mail…" value={query} onChange={event => setQuery(event.target.value)} />
          <label htmlFor="category-filter" className="sr-only">Catégorie</label>
          <select id="category-filter" className="adm-search" style={{ flex: '0 1 220px' }} value={category} onChange={event => setCategory(event.target.value)}><option value="">Toutes les catégories</option>{categories.map(item => <option key={item.slug} value={item.name}>{item.name}</option>)}</select>
          <label htmlFor="from-filter" className="sr-only">Du</label>
          <input id="from-filter" className="adm-search" style={{ flex: '0 1 160px' }} type="date" value={from} onChange={event => setFrom(event.target.value)} title="Du" />
          <label htmlFor="to-filter" className="sr-only">Au</label>
          <input id="to-filter" className="adm-search" style={{ flex: '0 1 160px' }} type="date" value={to} onChange={event => setTo(event.target.value)} title="Au" />
          <button type="button" className="adm-btn" onClick={resetFilters}>Réinitialiser</button>
          {!loading && <span className="adm-count" role="status">{visible.length} sur {items.length}</span>}
        </div>
        {error && <div className="notice notice-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
        {loading ? <p className="muted">Chargement de la file…</p> : visible.length === 0 ? <div className="adm-empty">{items.length === 0 ? 'Aucune proposition ici. Modifie les filtres ou la période.' : 'Aucune proposition ne correspond à cette recherche.'}</div> : (
          <div className="adm-grid">
            {visible.map(item => (
              <article className="adm-card" key={item.id}>
                <div className="adm-card-top"><span className="mono">{item.code}</span><span className={statusPill[item.status] || 'adm-pill'}>{statusName[item.status] || item.status}</span></div>
                <h3>{item.tool_name} · {item.discount_label}</h3>
                <p>{item.creator_name} · {new Date(item.created_at).toLocaleDateString('fr-FR')}{item.submitter_email ? ` · ${item.submitter_email}` : ''}</p>
                {item.comment && <p title={item.comment}>« {item.comment} »</p>}
                <div className="adm-card-foot">
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer">Source ↗</a>
                  {item.creator_link && <a href={item.creator_link} target="_blank" rel="noopener noreferrer">Lien ↗</a>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {item.status === 'new' ? <>
                    <button type="button" className="adm-btn adm-btn-pri" onClick={() => decide(item.id, 'approve')}>Valider</button>
                    <button type="button" className="adm-btn" onClick={() => decide(item.id, 'mark_duplicate')}>Doublon</button>
                    <button type="button" className="adm-btn" onClick={() => decide(item.id, 'reject')}>Refuser</button>
                  </> : <button type="button" className="adm-btn" onClick={() => decide(item.id, 'restore')}>Remettre à traiter</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
