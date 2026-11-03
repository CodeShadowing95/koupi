'use client';
// « Ça a marché ? » sur la page d'un outil. La logique du vote est dans useCodeVote.
import { useCodeVote } from './use-code-vote';

export function VoteButtons({ codeId, code }: { codeId: string; code: string }) {
  const { voted, message, sending, vote } = useCodeVote(codeId);

  if (voted && !message) return <p className="k-vote-done">Tu as dit que ce code {voted === 'up' ? 'marchait' : 'ne marchait pas'}. Merci !</p>;
  return (
    <div className="k-vote" role="group" aria-label={`Le code ${code} a-t-il marché ?`}>
      {voted ? <p className="k-vote-done" role="status">{message}</p> : (
        <>
          <span>Ça a marché ?</span>
          <button type="button" className="k-vote-btn" disabled={sending} onClick={() => vote(true)}>👍 Oui</button>
          <button type="button" className="k-vote-btn" disabled={sending} onClick={() => vote(false)}>👎 Non</button>
          {message && <span role="alert" className="k-vote-error">{message}</span>}
        </>
      )}
    </div>
  );
}
