'use client';
// « Ça a marché ? » : un vote par code, gardé dans ce navigateur pour ne pas reposer la question.
// Aucun compte ni cookie : le serveur limite les abus avec l'IP hachée, sans la garder avec le vote.
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'koupi-votes';

function readVotes(): Record<string, 'up' | 'down'> {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, 'up' | 'down'>; } catch { return {}; }
}

export function VoteButtons({ codeId, code }: { codeId: string; code: string }) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => { setVoted(readVotes()[codeId] ?? null); }, [codeId]);

  async function vote(worked: boolean) {
    setSending(true);
    try {
      const response = await fetch(`/api/codes/${codeId}/vote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ worked }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (response.ok || response.status === 409) {
        const value = worked ? 'up' : 'down';
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readVotes(), [codeId]: value })); } catch { /* stockage indisponible */ }
        setVoted(value);
        setMessage(response.ok ? 'Merci, c’est noté. Ton vote aide les suivants.' : body.error || 'Déjà noté, merci !');
      } else setMessage(body.error || 'Le vote n’a pas pu être envoyé.');
    } catch {
      setMessage('Le vote n’a pas pu être envoyé.');
    }
    setSending(false);
  }

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
