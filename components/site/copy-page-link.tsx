'use client';
// Bouton « Copier le lien de sa page » de la page d'un créateur : copie l'adresse de la page en cours,
// sans paramètre ni ancre, pour la partager. Affiche « Lien copié » quelques secondes.
import { useEffect, useRef, useState } from 'react';
import { copyText } from '@/lib/copy';

export function CopyPageLink({ label, className }: { label: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const ok = await copyText(`${window.location.origin}${window.location.pathname}`);
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2400);
  };

  return (
    <button type="button" className={className} onClick={copy}>
      <span aria-hidden={state !== 'idle'}>{state === 'copied' ? 'Lien copié ✓' : state === 'failed' ? 'Copie refusée' : label}</span>
      <span className="k-sr" role="status">{state === 'copied' ? 'Lien de la page copié' : state === 'failed' ? 'Le navigateur a refusé la copie' : ''}</span>
    </button>
  );
}
