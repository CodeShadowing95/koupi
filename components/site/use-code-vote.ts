'use client';
// Vote « Ça a marché ? » d'un code, partagé par les boutons de la page outil et le coupon de la page des codes.
// Un vote par code, gardé dans ce navigateur pour ne pas reposer la question.
// Aucun compte ni cookie : le serveur limite les abus avec l'IP hachée, sans la garder avec le vote.
import { useEffect, useState } from 'react';
import { CODE_VOTED_EVENT } from '@/lib/vote-invite';
import { voteOutcome } from '@/lib/vote-outcome';

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
  useEffect(() => {
    setVoted(readVotes()[codeId] ?? null);
    // Un vote donné ailleurs sur la page (coupon ou fenêtre « Laisse un 👍 ») met ce bouton à jour aussi.
    const onVoted = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; value: Vote }>).detail;
      if (detail?.id !== codeId) return;
      setVoted(detail.value);
      setFresh(true);
    };
    window.addEventListener(CODE_VOTED_EVENT, onVoted);
    return () => window.removeEventListener(CODE_VOTED_EVENT, onVoted);
  }, [codeId]);

  // Vote optimiste : le pouce s'allume tout de suite, puis s'éteint si le serveur refuse ou ne répond pas.
  // Le navigateur ne retient le vote et ne prévient les autres boutons qu'une fois le serveur d'accord.
  async function vote(worked: boolean) {
    const value: Vote = worked ? 'up' : 'down';
    const before = voted;
    setVoted(value);
    setFresh(true);
    setMessage('');
    setSending(true);
    let status: number | null = null;
    let error: string | undefined;
    try {
      const response = await fetch(`/api/codes/${codeId}/vote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ worked }) });
      status = response.status;
      error = (await response.json().catch(() => ({})) as { error?: string }).error;
    } catch { /* réseau coupé ou délai dépassé : status reste null */ }
    const outcome = voteOutcome(status, error);
    if (outcome.kept) {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readVotes(), [codeId]: value })); } catch { /* stockage indisponible */ }
      window.dispatchEvent(new CustomEvent(CODE_VOTED_EVENT, { detail: { id: codeId, value } }));
    } else {
      setVoted(before);
      setFresh(false);
    }
    setMessage(outcome.message);
    setSending(false);
  }

  return { voted, fresh, message, sending, vote };
}
