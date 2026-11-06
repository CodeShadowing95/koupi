// Pièces des cartes compactes de l'admin : statut en pastille, actions en icônes avec infobulle.
'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { copyText } from '@/lib/copy';
import { showCopyText } from '@/components/admin-ask';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

/** Point de couleur suivi d'un mot court (Vérifié, À tester…). Remplace le badge dans les cartes. */
export function StatusDot({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`adm-status is-${tone}`}>{children}</span>;
}

const paths = {
  check: 'm5 12 5 5 9-10',
  cross: 'M6 6l12 12M18 6 6 18',
  external: 'M7 17 17 7M8 7h9v9',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Z',
  restore: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
} as const;
export type IconName = keyof typeof paths;

export function Icon({ name }: { name: IconName }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'check' || name === 'cross' ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

type Common = { icon: IconName; label: string; tone?: 'ok' | 'bad' };

/** Bouton carré de 28 px : l'intitulé sert d'infobulle et de nom accessible. */
export function IconButton({ icon, label, tone, onClick, disabled }: Common & { onClick: () => void; disabled?: boolean }) {
  return <button type="button" className={`adm-mini-btn${tone ? ` is-${tone}` : ''}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}><Icon name={icon} /></button>;
}

/** Même apparence pour un lien ; un lien externe s'ouvre dans un nouvel onglet. */
export function IconLink({ icon, label, href, external }: Common & { href: string; external?: boolean }) {
  return <a className="adm-mini-btn" href={href} aria-label={label} title={label} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><Icon name={icon} /></a>;
}

/** Petite icône juste après un code : un clic le copie, puis une coche confirme pendant 1,5 s. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    if (!(await copyText(code))) { await showCopyText({ title: 'Copie le code', text: code }); return; }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  }
  const label = copied ? 'Code copié' : `Copier le code ${code}`;
  return (
    <button type="button" className={`adm-copy${copied ? ' is-copied' : ''}`} aria-label={label} title={copied ? 'Copié' : 'Copier le code'} onClick={copy}>
      <Icon name={copied ? 'check' : 'copy'} />
      <span className="sr-only" aria-live="polite">{copied ? 'Code copié' : ''}</span>
    </button>
  );
}

/** Nom de l'outil qui ouvre son site officiel dans un nouvel onglet, pour y essayer un code. Sans site valide : le nom seul. */
export function ToolSiteLink({ name, website, className }: { name: string; website?: string; className?: string }) {
  if (!website || !/^https?:\/\/[^\s/]+/i.test(website)) return <span className={className}>{name}</span>;
  return <a className={`adm-tool-site${className ? ` ${className}` : ''}`} href={website} target="_blank" rel="noopener noreferrer" title={`Ouvrir le site de ${name} pour essayer le code`}>{name}<span aria-hidden="true"> ↗</span><span className="sr-only"> (nouvel onglet)</span></a>;
}
