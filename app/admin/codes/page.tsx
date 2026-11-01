'use client';
import { useState } from 'react';
import { codes, type Code } from '@/lib/data';
import { matchesSearch } from '@/lib/admin-search';
import { ViewToggle, useAdminView } from '@/components/admin-view-toggle';
import { Pagination, usePagination } from '@/components/admin-pagination';

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
  const [view, setView] = useAdminView();
  const visible = codes.filter(code => (status === 'all' || code.status === status) && matchesSearch([code.code, code.tool, code.creator, code.discount, code.sourceTitle, code.note ?? ''], query));
  const { current, goTo, topRef } = usePagination(visible, `${status}|${query}`);
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
          <ViewToggle view={view} onChange={setView} />
        </div>
        <div ref={topRef} className="adm-list-top" />
        {visible.length === 0 ? <div className="adm-empty">Aucun code ne correspond à cette recherche.</div> : view === 'table' ? (
          <div className="adm-table-wrap adm-page-enter" key={`table-${current.page}`}>
            <table className="adm-table">
              <thead>
                <tr><th scope="col">Code</th><th scope="col">Outil</th><th scope="col">Réduction</th><th scope="col">Créateur</th><th scope="col">Votes</th><th scope="col">Réussite</th><th scope="col">Statut</th><th scope="col">Tri</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {current.items.map(code => (
                  <tr key={code.id}>
                    <td className="mono">{code.code}</td>
                    <td className="adm-cell-nowrap">{code.tool}</td>
                    <td className="adm-cell-wrap">{code.discount}</td>
                    <td className="adm-cell-wrap">{code.creator}</td>
                    <td className="adm-cell-muted">{code.votes}</td>
                    <td className="adm-cell-muted adm-cell-nowrap">{code.success} %</td>
                    <td><span className={statusLabel[code.status].className}>{statusLabel[code.status].label}</span></td>
                    <td className="adm-cell-muted adm-cell-wrap">{code.note ?? '—'}</td>
                    <td><div className="adm-cell-actions"><a href={code.source} target="_blank" rel="noopener noreferrer">Source ↗</a><button type="button" className="adm-btn">Modifier</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-grid adm-page-enter" key={`grid-${current.page}`}>
            {current.items.map(code => (
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
        <Pagination current={current} onChange={goTo} label="codes" />
      </div>
    </main>
  );
}
