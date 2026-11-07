'use client';
// Le vote d'un code, le même partout : 👍 avec le nombre de votes positifs, 👎 à côté.
// Le pouce choisi reste coloré ; un vote tout juste donné ajoute +1 au compteur. dark : sur le fond nuit.
import type { Code } from '@/lib/data';
import { useCodeVote } from '@/components/site/use-code-vote';

type Props = { code: Pick<Code, 'id' | 'code' | 'votes' | 'success'>; dark?: boolean };

export function CodeThumbs({ code, dark = false }: Props) {
  const { voted, fresh, message, sending, vote } = useCodeVote(code.id);
  // Votes positifs déjà comptés (taux de réussite × votes), plus le vôtre s'il vient d'être donné.
  const ups = Math.round((code.votes * code.success) / 100) + (voted === 'up' && fresh ? 1 : 0);
  return (
    <div className={`k-pass-thumbs${dark ? ' is-dark' : ''}`} role="group" aria-label={code.code ? `Le code ${code.code} a-t-il marché ?` : 'L’offre a-t-elle marché ?'}>
      <button type="button" className={`is-up${voted === 'up' && fresh ? ' is-new' : ''}${sending && !voted ? ' is-sending' : ''}`} aria-pressed={voted === 'up'}
        disabled={sending || voted !== null} onClick={() => vote(true)}
        title={voted ? `${ups} ${ups > 1 ? 'personnes disent' : 'personne dit'} que ce code marche` : 'Ce code a marché'}
        aria-label={`Ce code a marché (${ups} ${ups > 1 ? 'votes' : 'vote'})`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Zm0 0 4-7a2.5 2.5 0 0 1 2.5 3L13 10h5.5a2 2 0 0 1 2 2.4l-1.5 7A2 2 0 0 1 17 21H7" /></svg>
        {ups}
      </button>
      <button type="button" className={`is-down${voted === 'down' && fresh ? ' is-new' : ''}`} aria-pressed={voted === 'down'}
        disabled={sending || voted !== null} onClick={() => vote(false)}
        title={voted ? 'Ton vote est enregistré' : 'Ce code n’a pas marché'} aria-label="Ce code n’a pas marché">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3Zm0 0-4 7a2.5 2.5 0 0 1-2.5-3L11 14H5.5a2 2 0 0 1-2-2.4l1.5-7A2 2 0 0 1 7 3h10" /></svg>
      </button>
      {voted ? <span className="k-sr" role="status">{message}</span> : message && <span className="k-pass-thumbs-error" role="alert">{message}</span>}
    </div>
  );
}
