'use client';
import { useState } from 'react';

// Bouton simple « Copier et ouvrir » (listes de codes).
export function CopyButton({ code, link }: { code: string; link: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(code); setMessage('Code copié'); } catch { setMessage(`Copie ${code}`); }
    window.open(link, '_blank', 'noopener,noreferrer');
    setTimeout(() => setMessage(''), 2500);
  }
  return (
    <div>
      <button type="button" className="copy-button" onClick={copy}>{message || 'Copier et ouvrir'}</button>
      <span className="sr-only" role="status">{message}</span>
    </div>
  );
}

// Le ticket de la fiche outil : le talon se détache quand on copie.
export function CodeTicket({ code, link, creator, discount, tool, children }: { code: string; link: string; creator: string; discount: string; tool: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setFailed(false); } catch { setFailed(true); }
    setCopied(true);
    window.open(link, '_blank', 'noopener,noreferrer');
  }
  return (
    <>
      <div className="offer">
        <div className="offer-body">{children}</div>
        <div className={`stub${copied ? ' is-torn' : ''}`}>
          <span className="stub-code">{code}</span>
          <button type="button" className="copy-button" onClick={copy}>{copied ? 'Copié' : 'Copier et ouvrir'}</button>
        </div>
      </div>
      <div role="status" aria-live="polite">
        {copied && (
          <div className="copied">
            <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5L6.5 12L13 4.5" fill="none" stroke="#5BE3A4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>{failed ? `Copie le code ${code} à la main. ` : 'Copié. '}{creator} touche sa commission, toi tu gardes ta réduction ({discount}). {tool} s&apos;est ouvert dans un onglet.</span>
          </div>
        )}
      </div>
    </>
  );
}
