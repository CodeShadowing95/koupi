'use client';
// Fenêtres de confirmation et de saisie du back-office, à la place de window.confirm et window.prompt :
// même style que les autres fenêtres de l'admin, texte lisible, bouton rouge pour ce qui retire quelque chose.
// askConfirm / askText renvoient une promesse ; <AdminAskHost /> (dans la coque) affiche la fenêtre.
import { useEffect, useRef, useState } from 'react';
import { afterDialogClose } from '@/lib/admin-dialog';
import { splitQuestion } from '@/lib/admin-ask';

type ConfirmOptions = { title: string; message?: React.ReactNode; confirmLabel?: string; danger?: boolean };
type TextOptions = { title: string; message?: React.ReactNode; label: string; initial?: string; placeholder?: string; confirmLabel?: string; inputMode?: 'text' | 'numeric' };
type CopyOptions = { title: string; text: string };

type Request =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'text'; options: TextOptions; resolve: (value: string | null) => void }
  | { kind: 'copy'; options: CopyOptions; resolve: () => void };

let show: ((request: Request) => void) | null = null;

/** Demande une confirmation. Renvoie true si l'admin confirme. Sans fenêtre montée (hors admin), retombe sur window.confirm. */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  if (!show) return Promise.resolve(window.confirm(options.title));
  return new Promise(resolve => show!({ kind: 'confirm', options, resolve }));
}

/** Raccourci : une question écrite d'un bloc (« Archiver X ? L'outil disparaît… »), titre et explication séparés. */
export function confirmAction(question: string, options: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  const { title, message } = splitQuestion(question);
  return askConfirm({ title, message: message ?? undefined, ...options });
}

/** Demande un texte. Renvoie le texte saisi (peut être vide), ou null si l'admin annule. */
export function askText(options: TextOptions): Promise<string | null> {
  if (!show) return Promise.resolve(window.prompt(options.title, options.initial ?? ''));
  return new Promise(resolve => show!({ kind: 'text', options, resolve }));
}

/** Montre un texte déjà sélectionné, à copier à la main quand le presse-papiers refuse. */
export function showCopyText(options: CopyOptions): Promise<void> {
  if (!show) { window.prompt(options.title, options.text); return Promise.resolve(); }
  return new Promise(resolve => show!({ kind: 'copy', options, resolve }));
}

export function AdminAskHost() {
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState('');
  const answer = useRef<unknown>(undefined);

  useEffect(() => {
    show = next => {
      answer.current = undefined;
      setValue(next.kind === 'text' ? next.options.initial ?? '' : next.kind === 'copy' ? next.options.text : '');
      setRequest(next);
    };
    return () => { show = null; };
  }, []);

  useEffect(() => {
    if (!request) return;
    if (!dialog.current?.open) dialog.current?.showModal();
    if (request.kind !== 'confirm') requestAnimationFrame(() => { field.current?.focus(); field.current?.select(); });
  }, [request]);

  function close(result: unknown) {
    answer.current = result;
    dialog.current?.close();
  }

  function onClose() {
    const current = request;
    if (!current) return;
    if (current.kind === 'confirm') current.resolve(answer.current === true);
    else if (current.kind === 'text') current.resolve(typeof answer.current === 'string' ? answer.current : null);
    else current.resolve();
    afterDialogClose(() => { if (!dialog.current?.open) setRequest(null); });
  }

  const options = request?.options;
  const danger = request?.kind === 'confirm' && request.options.danger;
  return (
    <dialog ref={dialog} className="adm-dialog adm-dialog-sm adm-ask" aria-label={options?.title} onClose={onClose}>
      {request && (
        <form className="adm-form" onSubmit={event => { event.preventDefault(); close(request.kind === 'text' ? value : true); }}>
          <div className="adm-dialog-head"><h2>{request.options.title}</h2></div>
          {'message' in request.options && request.options.message && <div className="adm-ask-message">{request.options.message}</div>}
          {request.kind === 'text' && (
            <div className="field">
              <label htmlFor="adm-ask-field">{request.options.label}</label>
              <input id="adm-ask-field" ref={field} value={value} onChange={event => setValue(event.target.value)} placeholder={request.options.placeholder} inputMode={request.options.inputMode} autoComplete="off" />
            </div>
          )}
          {request.kind === 'copy' && (
            <div className="field">
              <label htmlFor="adm-ask-field">Sélectionne le texte et copie-le (Ctrl+C ou ⌘C).</label>
              <input id="adm-ask-field" ref={field} value={value} readOnly onFocus={event => event.target.select()} />
            </div>
          )}
          <div className="adm-dialog-foot">
            <span style={{ flex: 1 }} />
            {request.kind === 'copy'
              ? <button type="submit" className="adm-btn adm-btn-pri">Fermer</button>
              : <>
                  <button type="button" className="adm-btn" onClick={() => close(undefined)} autoFocus={!!danger}>Annuler</button>
                  <button type="submit" className={`adm-btn ${danger ? 'adm-btn-danger-solid' : 'adm-btn-pri'}`} autoFocus={request.kind === 'confirm' && !danger}>{request.options.confirmLabel ?? (request.kind === 'text' ? 'Valider' : 'Confirmer')}</button>
                </>}
          </div>
        </form>
      )}
    </dialog>
  );
}
