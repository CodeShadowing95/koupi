'use client';
import { useEffect, useState } from 'react';
import { categories } from '@/lib/data';
type Submission = { id: string; tool_name: string; creator_name: string; code: string; discount_label: string; source_url: string; creator_link: string | null; comment: string | null; submitter_email: string | null; status: string; admin_note: string | null; created_at: string };
export default function Propositions() {
  const [items, setItems] = useState<Submission[]>([]);
  const [status, setStatus] = useState('new');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  }
  function resetFilters() { setCategory(''); setFrom(''); setTo(''); }
  return <main className="page"><div className="container"><span className="eyebrow">Modération</span><h1>Propositions</h1><p className="hero-copy">Vérifie la source et décide ce qui peut entrer dans le catalogue public.</p><div style={{ display: 'flex', gap: 8, margin: '30px 0 16px', flexWrap: 'wrap' }}>{['new', 'duplicate', 'approved', 'rejected', 'all'].map(option => <button key={option} className={status === option ? 'submit' : 'tag'} onClick={() => setStatus(option)}>{option === 'new' ? 'À traiter' : option === 'duplicate' ? 'Doublons' : option === 'approved' ? 'Validées' : option === 'rejected' ? 'Refusées' : 'Toutes'}</button>)}</div><div className="feature-panel" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}><div className="field"><label htmlFor="category-filter">Catégorie</label><select id="category-filter" value={category} onChange={event => setCategory(event.target.value)}><option value="">Toutes les catégories</option>{categories.map(item => <option key={item.slug} value={item.name}>{item.name}</option>)}</select></div><div className="field"><label htmlFor="from-filter">Du</label><input id="from-filter" type="date" value={from} onChange={event => setFrom(event.target.value)} /></div><div className="field"><label htmlFor="to-filter">Au</label><input id="to-filter" type="date" value={to} onChange={event => setTo(event.target.value)} /></div><button className="tag" onClick={resetFilters}>Réinitialiser</button></div>{error && <div className="notice" style={{ background: '#fff1f1', color: '#a12626' }}>{error}</div>}{loading ? <p className="muted">Chargement de la file…</p> : items.length === 0 ? <div className="feature-panel"><h2>Aucune proposition ici.</h2><p className="muted">Modifie les filtres ou la période sélectionnée.</p></div> : <div className="code-list">{items.map(item => <article className="code-card" key={item.id}><div><span className="tag">{item.status}</span><h3 style={{ marginTop: 10 }}>{item.code} · {item.tool_name}</h3><p>Créateur : {item.creator_name}</p><p className="muted">{item.discount_label}</p><p className="muted">{new Date(item.created_at).toLocaleDateString('fr-FR')}</p>{item.comment && <p style={{ marginTop: 10 }}>{item.comment}</p>}{item.submitter_email && <p className="muted">Contact : {item.submitter_email}</p>}</div><div><a className="text-link" href={item.source_url} target="_blank" rel="noopener noreferrer">Vérifier la source ↗</a>{item.creator_link && <a className="text-link" style={{ display: 'block', marginTop: 8 }} href={item.creator_link} target="_blank" rel="noopener noreferrer">Lien du créateur ↗</a>}</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{item.status === 'new' && <><button className="submit" onClick={() => decide(item.id, 'approve')}>Valider</button><button className="tag" onClick={() => decide(item.id, 'mark_duplicate')}>Doublon</button><button className="tag" onClick={() => decide(item.id, 'reject')}>Refuser</button></>}{item.status !== 'new' && <button className="tag" onClick={() => decide(item.id, 'restore')}>Remettre à traiter</button>}</div></article>)}</div>}</div></main>;
}
