'use client';
import { useState } from 'react';
import { codes, type Code } from '@/lib/data';
import { matchesSearch } from '@/lib/admin-search';

const statusLabel: Record<Code['status'], { label: string; className: string }> = {
  verified: { label: 'Vérifié', className: 'adm-pill adm-pill-ok' },
  to_test: { label: 'À tester', className: 'adm-pill adm-pill-warn' },
  pending: { label: 'En attente', className: 'adm-pill' },
  rejected: { label: 'Rejeté', className: 'adm-pill adm-pill-bad' },
};
const filters: { value: 'all' | Code['status']; label: string }[] = [
  { value: 'all', label: 'Tous' }, { value: 'verified', label: 'Vérifiés' }, { value: 'to_test', label: 'À tester' }, { value: 'pending', label: 'En attente' }, { value: 'rejected', label: 'Rejetés' },
];

export default function AdminCodes() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Code['status']>('all');
  const visible = codes.filter(code => (status === 'all' || code.status === status) && matchesSearch([code.code, code.tool, code.creator, code.discount, code.sourceTitle, code.note ?? ''], query));
  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Modération</span>
            <h1>Codes</h1>
            <p>Vérifie la source, complète la réduction, puis publie uniquement les codes fiables. Seuls les codes vérifiés et à tester sont visibles sur le site.</p>
          </div>
        </div>
        <div className="adm-toolbar">
          <label htmlFor="code-search" className="sr-only">Rechercher un code</label>
          <input id="code-search" className="adm-search" type="search" placeholder="Rechercher un code, un outil, un créateur…" value={query} onChange={event => setQuery(event.target.value)} />
          <div className="adm-filters">
            {filters.map(filter => <button key={filter.value} type="button" className="adm-filter" aria-pressed={status === filter.value} onClick={() => setStatus(filter.value)}>{filter.label}</button>)}
          </div>
          <span className="adm-count" role="status">{visible.length} sur {codes.length}</span>
        </div>
        {visible.length === 0 ? <div className="adm-empty">Aucun code ne correspond à cette recherche.</div> : (
          <div className="adm-grid">
            {visible.map(code => (
              <article className="adm-card" key={code.id}>
                <div className="adm-card-top"><span className="mono">{code.code}</span><span className={statusLabel[code.status].className}>{statusLabel[code.status].label}</span></div>
                <h3>{code.tool} · {code.discount}</h3>
                <p>{code.creator} · {code.votes} votes, {code.success} % de réussite</p>
                {code.note && <p className="adm-note">Tri : {code.note}</p>}
                <div className="adm-card-foot">
                  <a href={code.source} target="_blank" rel="noopener noreferrer">Source ↗</a>
                  <button type="button" className="adm-btn" style={{ marginLeft: 'auto' }}>Modifier</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
