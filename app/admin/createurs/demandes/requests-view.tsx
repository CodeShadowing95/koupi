'use client';
// Demandes venues des pages publiques des créateurs : « C'est ma page » (revendication) et « Page incorrecte » (signalement).
// En attendant l'espace créateur, on les traite à la main : on vérifie, on répond par e-mail, puis on marque « Traitée ».
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminCreatorRequest, CreatorRequestStatus } from '@/lib/creator-requests';
import { sendJson } from '@/components/admin-form-dialog';
import { StatusDot } from '@/components/admin-card';

type Filter = CreatorRequestStatus | 'all';
const filters: { value: Filter; label: string }[] = [
  { value: 'new', label: 'À traiter' }, { value: 'done', label: 'Traitées' }, { value: 'dismissed', label: 'Écartées' }, { value: 'all', label: 'Toutes' },
];
const KIND = { claim: { label: 'C’est ma page', tone: 'info' as const }, report: { label: 'Page incorrecte', tone: 'warn' as const } };
const STATUS = { new: 'À traiter', done: 'Traitée', dismissed: 'Écartée' };
const dateFr = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

function replyLink(request: AdminCreatorRequest) {
  if (!request.email) return null;
  const subject = request.kind === 'claim' ? `Ta page ${request.creator.name} sur Koupi` : `Ton signalement sur la page ${request.creator.name}`;
  return `mailto:${request.email}?subject=${encodeURIComponent(subject)}`;
}

export function RequestsView({ requests, granted }: { requests: AdminCreatorRequest[]; granted: string[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('new');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const shown = requests.filter(request => filter === 'all' || request.status === filter);
  const countOf = (value: Filter) => requests.filter(request => value === 'all' || request.status === value).length;

  async function setStatus(request: AdminCreatorRequest, status: CreatorRequestStatus) {
    setBusy(request.id);
    setError('');
    const note = notes[request.id];
    const failed = await sendJson(`/api/admin/creator-requests/${request.id}`, 'PATCH', note === undefined ? { status } : { status, adminNote: note });
    setBusy(null);
    if (failed) setError(failed); else router.refresh();
  }

  // Accès à l'espace créateur (ADR-0021) : seulement après la preuve par la bio, le serveur le vérifie.
  const hasAccess = (request: AdminCreatorRequest) => Boolean(request.email) && granted.includes(`${request.email!.toLowerCase()}|${request.creator.id}`);
  async function setAccess(request: AdminCreatorRequest, grant: boolean) {
    const question = grant
      ? `Donner à ${request.email} l’accès à l’espace de ${request.creator.name} ? Fais-le seulement si cette personne a prouvé un compte par la bio.`
      : `Retirer à ${request.email} l’accès à l’espace de ${request.creator.name} ?`;
    if (!window.confirm(question)) return;
    setBusy(request.id);
    setError('');
    const failed = await sendJson(`/api/admin/creator-requests/${request.id}/access`, 'POST', { grant });
    setBusy(null);
    if (failed) setError(failed); else router.refresh();
  }

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Modération</span>
            <h1>Demandes des créateurs</h1>
            <p>Envoyées depuis la page publique d’un créateur. <b>C’est ma page</b> : quelqu’un dit être le créateur et veut gérer sa page. <b>Page incorrecte</b> : un visiteur signale une erreur. Réponds par e-mail, puis marque la demande comme traitée.</p>
          </div>
        </div>
        <div className="adm-tabs" role="group" aria-label="Filtre">
          {filters.map(item => <button key={item.value} type="button" className="adm-tab" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label} <span className="adm-tab-n">{countOf(item.value)}</span></button>)}
        </div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {shown.length === 0 ? (
          <div className="adm-empty">{filter === 'new' ? 'Aucune demande à traiter. Tout est à jour.' : 'Aucune demande ici.'}</div>
        ) : (
          <div className="adm-req-list">
            {shown.map(request => {
              const reply = replyLink(request);
              return (
                <article className="adm-card adm-req" key={request.id}>
                  <div className="adm-card-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <StatusDot tone={KIND[request.kind].tone}>{KIND[request.kind].label}</StatusDot>
                      <b>{request.creator.name}</b>
                      <a href={`/creators/${request.creator.slug}`} target="_blank" rel="noopener noreferrer">Page publique ↗</a>
                      <a href={`/admin/createurs?q=${encodeURIComponent(request.creator.name)}`}>Fiche admin</a>
                    </span>
                    <small className="muted">{dateFr(request.createdAt)} · {STATUS[request.status]}{request.handledAt ? ` le ${dateFr(request.handledAt)}` : ''}</small>
                  </div>
                  <dl className="adm-req-facts">
                    {request.accountUrl && <><dt>Compte annoncé</dt><dd><a href={request.accountUrl} target="_blank" rel="noopener noreferrer nofollow">{request.accountUrl} ↗</a></dd></>}
                    <dt>E-mail</dt><dd>{request.email ? (reply ? <a href={reply}>{request.email}</a> : request.email) : <span className="muted">Non donné</span>}</dd>
                    {request.message && <><dt>Message</dt><dd style={{ whiteSpace: 'pre-line' }}>{request.message}</dd></>}
                  </dl>
                  {request.kind === 'claim' && request.status === 'new' && (
                    <p className="adm-ca-hint">Pour qu’il prouve que le compte est le sien : ouvre sa <a href={`/admin/createurs?q=${encodeURIComponent(request.creator.name)}`}>fiche admin</a>, relie ce compte s’il ne l’est pas, puis <b>Donner un code</b> et envoie-lui le message. Une fois le compte prouvé, <b>Donner l’accès à son espace</b>.</p>
                  )}
                  <div className="field">
                    <label htmlFor={`note-${request.id}`}>Note pour toi <span className="muted">(facultatif)</span></label>
                    <input id={`note-${request.id}`} maxLength={500} value={notes[request.id] ?? request.adminNote ?? ''} onChange={event => setNotes({ ...notes, [request.id]: event.target.value })} placeholder="Ex. Code dans la description vérifié le 3/11, compte relié." />
                  </div>
                  <div className="adm-card-foot" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {reply && request.status === 'new' && <a className="adm-btn" href={reply}>Répondre par e-mail</a>}
                    {request.kind === 'claim' && request.email && (hasAccess(request)
                      ? <><span className="adm-req-access">✓ Accès à son espace donné</span><button type="button" className="adm-btn" disabled={busy === request.id} onClick={() => setAccess(request, false)}>Retirer l’accès</button></>
                      : <button type="button" className="adm-btn" disabled={busy === request.id} onClick={() => setAccess(request, true)}>Donner l’accès à son espace</button>)}
                    <span style={{ flex: 1 }} />
                    {request.status === 'new' ? <>
                      <button type="button" className="adm-btn" disabled={busy === request.id} onClick={() => setStatus(request, 'dismissed')}>Écarter</button>
                      <button type="button" className="adm-btn adm-btn-pri" disabled={busy === request.id} onClick={() => setStatus(request, 'done')}>Marquer traitée</button>
                    </> : <button type="button" className="adm-btn" disabled={busy === request.id} onClick={() => setStatus(request, 'new')}>Rouvrir</button>}
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
