'use client';
import { useEffect, useState } from 'react';
import type { Code } from '@/lib/data';
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
  { value: 'all', label: 'Tous' }, { value: 'to_test', label: 'À tester' }, { value: 'pending', label: 'En attente' }, { value: 'verified', label: 'Vérifiés' }, { value: 'rejected', label: 'Rejetés' },
];
const isFilter = (value: string | null): value is 'all' | Code['status'] => filters.some(filter => filter.value === value);

export function CodesView({ codes }: { codes: Code[] }) {
  const countOf = (value: 'all' | Code['status']) => value === 'all' ? codes.length : codes.filter(code => code.status === value).length;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Code['status']>('all');
  const [view, setView] = useAdminView();
  // Les liens de l'accueil ouvrent la liste déjà filtrée (?status=to_test, ?q=CODE).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('status');
    if (isFilter(fromUrl)) setStatus(fromUrl);
    if (params.get('q')) setQuery(params.get('q') ?? '');
  }, []);
  const visible = codes.filter(code => (status === 'all' || code.status === status) && matchesSearch([code.code, code.tool, code.creator, code.discount, code.sourceTitle, code.note ?? ''], query));
  const { current, goTo, topRef, size, changeSize } = usePagination(visible, `${status}|${query}`);
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
        <div className="adm-tabs" role="group" aria-label="Statut">
          {filters.map(filter => <button key={filter.value} type="button" className="adm-tab" aria-pressed={status === filter.value} onClick={() => setStatus(filter.value)}>{filter.label} {filter.value === 'to_test' && countOf('to_test') > 0 && status !== 'to_test' ? <span className="adm-count-badge">{countOf('to_test')}</span> : <span className="adm-tab-n">{countOf(filter.value)}</span>}</button>)}
        </div>
        <div className="adm-toolbar">
          <label htmlFor="code-search" className="sr-only">Rechercher un code</label>
          <input id="code-search" className="adm-search" type="search" placeholder="Rechercher un code, un outil, un créateur…" value={query} onChange={event => setQuery(event.target.value)} />
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
        <Pagination current={current} onChange={goTo} label="codes" size={size} onSizeChange={changeSize} />
      </div>
    </main>
  );
}
