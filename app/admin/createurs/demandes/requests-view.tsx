'use client';
// Demandes venues des pages publiques des créateurs : « C'est ma page » (revendication) et « Page incorrecte » (signalement).
// En attendant l'espace créateur, on les traite à la main : on vérifie, on répond par e-mail, puis on marque « Traitée ».
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminCreatorRequest, CreatorRequestStatus } from '@/lib/creator-requests';
import type { SubmittedCode } from '@/lib/creator-self-proof';
import type { PageToLink } from '@/lib/creator-merge';
import { sendJson } from '@/components/admin-form-dialog';
import { StatusDot } from '@/components/admin-card';
import { RefreshButton } from '@/components/admin-refresh-button';
import { parisDate } from '@/lib/paris-date';
import { confirmAction } from '@/components/admin-ask';
import { routes } from '@/lib/routes';

type Filter = CreatorRequestStatus | 'all';
const filters: { value: Filter; label: string }[] = [
  { value: 'new', label: 'À traiter' }, { value: 'done', label: 'Traitées' }, { value: 'dismissed', label: 'Écartées' }, { value: 'all', label: 'Toutes' },
];
const KIND = { claim: { label: 'C’est ma page', tone: 'info' as const }, report: { label: 'Page incorrecte', tone: 'warn' as const } };
const STATUS = { new: 'À traiter', done: 'Traitée', dismissed: 'Écartée' };
const dateFr = (iso: string) => parisDate(iso, { dateStyle: 'medium', timeStyle: 'short' });

function replyLink(request: AdminCreatorRequest) {
  if (!request.email) return null;
  const subject = request.kind === 'claim' ? `Ta page ${request.creator.name} sur Merkod` : `Ton signalement sur la page ${request.creator.name}`;
  return `mailto:${request.email}?subject=${encodeURIComponent(subject)}`;
}

/** Pourquoi « Donner l’accès » reste grisé : le serveur refuse tant qu'aucun compte n'est prouvé par la bio. */
const NOT_PROVEN = 'Fais d’abord prouver un de ses comptes par la bio : l’accès ne se donne qu’au vrai créateur.';

export function RequestsView({ requests, granted, proven, submitted, toLink }: { requests: AdminCreatorRequest[]; granted: string[]; proven: string[]; submitted: SubmittedCode[]; toLink: PageToLink[] }) {
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
    if (!(await confirmAction(question, { confirmLabel: grant ? 'Donner l’accès' : 'Retirer l’accès', danger: !grant }))) return;
    setBusy(request.id);
    setError('');
    const failed = await sendJson(`/api/admin/creator-requests/${request.id}/access`, 'POST', { grant });
    setBusy(null);
    if (failed) setError(failed); else router.refresh();
  }

  // Codes posés par un créateur sur un réseau que Merkod ne lit pas (ADR-0041) : tu regardes le profil et tu dis si tu le vois.
  async function review(item: SubmittedCode, seen: boolean) {
    const question = seen
      ? `Tu vois bien ${item.code} dans la bio de ${item.account.handle} (${item.account.label}) ? Le compte sera prouvé et ${item.email} entrera dans l’espace de ${item.creator.name}.`
      : `Tu ne trouves pas ${item.code} sur ${item.account.handle} ? Le créateur pourra réessayer depuis son espace.`;
    if (!(await confirmAction(question, { confirmLabel: seen ? 'Oui, je le vois' : 'Pas trouvé', danger: !seen }))) return;
    setBusy(item.id);
    setError('');
    const failed = await sendJson(`/api/admin/creator-claim-codes/${item.id}`, 'POST', { seen });
    setBusy(null);
    if (failed) setError(failed); else router.refresh();
  }

  // Pages à relier (ADR-0044) : une invitation par e-mail, envoyée seulement quand tu cliques.
  async function invite(item: PageToLink) {
    const again = item.invitedAt ? ` Tu l’as déjà invité le ${dateFr(item.invitedAt)}.` : '';
    const question = `Envoyer à ${item.email} une invitation à relier sa page « ${item.page.name} » à la page ${item.match.name} ?${again} Il devra quand même la prouver par sa bio.`;
    if (!(await confirmAction(question, { confirmLabel: 'Envoyer l’invitation' }))) return;
    setBusy(item.userId);
    setError('');
    const failed = await sendJson(`/api/admin/pages-to-link/${item.userId}`, 'POST', {});
    setBusy(null);
    if (failed) setError(failed); else router.refresh();
  }

  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h1>Demandes des créateurs</h1>
            <p>Envoyées depuis la page publique d’un créateur. <b>C’est ma page</b> : quelqu’un dit être le créateur et veut gérer sa page. <b>Page incorrecte</b> : un visiteur signale une erreur. Réponds par e-mail, puis marque la demande comme traitée.</p>
          </div>
          <div className="adm-head-actions"><RefreshButton /></div>
        </div>
        {submitted.length > 0 && (
          <section className="adm-card adm-req adm-proof" aria-labelledby="adm-proof-title">
            <h2 id="adm-proof-title">Codes à constater <span className="adm-tab-n">{submitted.length}</span></h2>
            <p className="adm-ca-hint">Ces créateurs disent avoir mis leur code dans la bio d’un réseau que Merkod ne lit pas tout seul. Ouvre le profil : si tu vois le code, le compte est prouvé et le créateur entre dans son espace.</p>
            <ul className="adm-proof-list">
              {submitted.map(item => (
                <li key={item.id}>
                  <span>
                    <b>{item.creator.name}</b> · {item.account.label} <a href={item.account.url} target="_blank" rel="noopener noreferrer nofollow">{item.account.handle} ↗</a>
                    <br /><code>{item.code}</code> <small className="muted">· {item.email} · {dateFr(item.submittedAt)}</small>
                  </span>
                  <span className="adm-proof-actions">
                    <button type="button" className="adm-btn" disabled={busy === item.id} onClick={() => review(item, false)}>Pas trouvé</button>
                    <button type="button" className="adm-btn adm-btn-pri" disabled={busy === item.id} onClick={() => review(item, true)}>J’ai vu le code</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {toLink.length > 0 && (
          <section className="adm-card adm-req adm-proof" aria-labelledby="adm-link-title">
            <h2 id="adm-link-title">Pages à relier <span className="adm-tab-n">{toLink.length}</span></h2>
            <p className="adm-ca-hint">Ces créateurs ont ouvert leur studio sur une page provisoire, alors qu’une page au nom proche existe déjà. Si c’est sans doute la même personne, envoie-lui l’invitation : il revendique la vraie page, la prouve par sa bio, et sa page provisoire y est fusionnée.</p>
            <ul className="adm-proof-list">
              {toLink.map(item => (
                <li key={item.userId}>
                  <span>
                    <b>{item.page.name}</b> <small className="muted">(page provisoire · {item.email})</small>
                    <br />ressemble à <a href={`/admin/createurs?q=${encodeURIComponent(item.match.name)}`}>{item.match.name}</a>
                    {item.match.accounts.length > 0 && <small className="muted"> · {item.match.accounts.map(account => account.handle).join(', ')}</small>}
                    <small className="muted"> · {item.match.codes} {item.match.codes > 1 ? 'codes' : 'code'}{item.invitedAt ? ` · invité le ${dateFr(item.invitedAt)}` : ''}</small>
                  </span>
                  <span className="adm-proof-actions">
                    <button type="button" className={item.invitedAt ? 'adm-btn' : 'adm-btn adm-btn-pri'} disabled={busy === item.userId} onClick={() => invite(item)}>{item.invitedAt ? 'Renvoyer' : 'Envoyer l’invitation'}</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
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
                      <a href={routes.creator(request.creator.slug)} target="_blank" rel="noopener noreferrer">Page publique ↗</a>
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
                    <p className="adm-ca-hint">Ouvre sa <a href={`/admin/createurs?q=${encodeURIComponent(request.creator.name)}`}>fiche admin</a>, relie ce compte s’il ne l’est pas et coche <b>J’ai contrôlé ce compte</b>. S’il est connecté, le créateur prouve ensuite le compte lui-même depuis son espace, qui s’ouvre tout seul. Sinon, tu peux toujours <b>Donner un code</b> à la main, puis <b>Donner l’accès à son espace</b>.</p>
                  )}
                  <div className="field">
                    <label htmlFor={`note-${request.id}`}>Note pour toi <span className="muted">(facultatif)</span></label>
                    <input id={`note-${request.id}`} maxLength={500} value={notes[request.id] ?? request.adminNote ?? ''} onChange={event => setNotes({ ...notes, [request.id]: event.target.value })} placeholder="Ex. Code dans la description vérifié le 3/11, compte relié." />
                  </div>
                  <div className="adm-card-foot" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {reply && request.status === 'new' && <a className="adm-btn" href={reply}>Répondre par e-mail</a>}
                    {request.kind === 'claim' && request.email && (hasAccess(request)
                      ? <><span className="adm-req-access">✓ Accès à son espace donné</span><button type="button" className="adm-btn" disabled={busy === request.id} onClick={() => setAccess(request, false)}>Retirer l’accès</button></>
                      : proven.includes(request.creator.id)
                        ? <button type="button" className="adm-btn" disabled={busy === request.id} onClick={() => setAccess(request, true)}>Donner l’accès à son espace</button>
                        : <span className="adm-req-locked" title={NOT_PROVEN}><button type="button" className="adm-btn" disabled aria-describedby={`locked-${request.id}`}>Donner l’accès à son espace</button><span id={`locked-${request.id}`} className="sr-only">{NOT_PROVEN}</span></span>)}
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
