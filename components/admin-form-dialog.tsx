'use client';
// Fenêtre de formulaire du back-office (outil, créateur, catégorie) : titre, champs, erreur, boutons.
// onSubmit renvoie un message d'erreur, ou null quand c'est enregistré (la page est alors rechargée côté serveur).
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export async function sendJson(url: string, method: string, body: unknown): Promise<string | null> {
  try {
    const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (response.ok) return null;
    const result = await response.json().catch(() => ({})) as { error?: string };
    return result.error || 'L’enregistrement a échoué.';
  } catch {
    return 'L’enregistrement a échoué. Vérifie ta connexion.';
  }
}

export function FormDialog({ open, title, intro, submitLabel = 'Enregistrer', onClose, onSubmit, extra, children }: {
  open: boolean; title: string; intro?: React.ReactNode; submitLabel?: string; onClose: () => void;
  onSubmit: () => Promise<string | null>; extra?: React.ReactNode; children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setError(''); setSaving(false); if (!dialog.current?.open) dialog.current?.showModal(); }
    else dialog.current?.close();
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const failure = await onSubmit();
    if (failure) { setError(failure); setSaving(false); return; }
    dialog.current?.close();
    router.refresh();
  }

  return (
    <dialog ref={dialog} className="adm-dialog adm-dialog-sm" aria-label={title} onClose={onClose}>
      {open && (
        <form className="adm-form" onSubmit={submit}>
          <div className="adm-dialog-head">
            <h2>{title}</h2>
            <button type="button" className="adm-icon-btn" aria-label="Fermer" onClick={() => dialog.current?.close()}>✕</button>
          </div>
          {intro && <p className="adm-dialog-intro">{intro}</p>}
          <div className="adm-form-grid">{children}</div>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <div className="adm-dialog-foot">
            {extra}
            <span style={{ flex: 1 }} />
            <button type="button" className="adm-btn" onClick={() => dialog.current?.close()}>Annuler</button>
            <button type="submit" className="adm-btn adm-btn-pri" disabled={saving}>{saving ? 'Enregistrement…' : submitLabel}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
