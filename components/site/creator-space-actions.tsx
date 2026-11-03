'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { routes } from '@/lib/routes';

/** Copie le lien de sa page publique, à coller dans ses descriptions. */
export function CopyPageLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = new URL(path, window.location.origin).toString();
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { window.prompt('Copie ce lien :', url); }
  }
  return <button type="button" className="k-btn k-btn-primary" onClick={copy}>{copied ? 'Lien copié' : 'Copier le lien de ma page'}</button>;
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await fetch('/api/creator-auth/sign-out', { method: 'POST' }).catch(() => null);
    router.replace(routes.forCreators());
    router.refresh();
  }
  return <button type="button" className="k-link-btn" disabled={busy} onClick={signOut}>Se déconnecter</button>;
}
