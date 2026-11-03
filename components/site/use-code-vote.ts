'use client';
// Vote « Ça a marché ? » d'un code, partagé par les boutons de la page outil et le coupon de la page des codes.
// Un vote par code, gardé dans ce navigateur pour ne pas reposer la question.
// Aucun compte ni cookie : le serveur limite les abus avec l'IP hachée, sans la garder avec le vote.
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'koupi-votes';
export type Vote = 'up' | 'down';

function readVotes(): Record<string, Vote> {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, Vote>; } catch { return {}; }
}

export function useCodeVote(codeId: string) {
  const [voted, setVoted] = useState<Vote | null>(null);
  /** Vrai juste après un vote dans cette visite (pour l'animation du tampon). */
  const [fresh, setFresh] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => { setVoted(readVotes()[codeId] ?? null); }, [codeId]);

  async function vote(worked: boolean) {
    setSending(true);
    try {
      const response = await fetch(`/api/codes/${codeId}/vote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ worked }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (response.ok || response.status === 409) {
        const value: Vote = worked ? 'up' : 'down';
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readVotes(), [codeId]: value })); } catch { /* stockage indisponible */ }
        setVoted(value);
        setFresh(true);
        setMessage(response.ok ? 'Merci, c’est noté. Ton vote aide les suivants.' : body.error || 'Déjà noté, merci !');
      } else setMessage(body.error || 'Le vote n’a pas pu être envoyé.');
    } catch {
      setMessage('Le vote n’a pas pu être envoyé.');
    }
    setSending(false);
  }

  return { voted, fresh, message, sending, vote };
}
