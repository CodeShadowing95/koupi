'use client';
// Pochette d'un podcast dans l'admin. Si l'image manque ou ne charge pas, les initiales du titre la remplacent,
// comme pour les créateurs, au lieu de l'icône d'image cassée du navigateur.
import { useState } from 'react';
import { initials } from '@/lib/admin-card';

export function PodcastArt({ src, title, size, className = '' }: { src?: string | null; title: string; size: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    // eslint-disable-next-line @next/next/no-img-element -- pochette servie par Apple, déjà petite
    return <img className={className || undefined} src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  }
  return <span className={`${className} adm-pod-noimg adm-pod-initials`.trim()} aria-hidden="true">{initials(title)}</span>;
}
