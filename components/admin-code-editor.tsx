'use client';
// Fenêtre de saisie d'un code : nouveau code, modification, ou validation d'une proposition.
// Tout est enregistré en base par /api/admin/codes, puis la page est rechargée côté serveur (router.refresh).
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Code, CodeStatus } from '@/lib/data';
import type { ToolOption } from '@/lib/codes-admin';

export type EditorTarget =
  | { kind: 'create' }
  | { kind: 'edit'; code: Code }
  | { kind: 'submission'; submission: { id: string; tool_name: string; creator_name: string; code: string; discount_label: string; source_url: string; creator_link: string | null; category: string | null } };

const NEW_TOOL = '__new__';
const statusOptions: { value: CodeStatus; label: string; hint: string }[] = [
  { value: 'to_test', label: 'À tester', hint: 'visible sur le site, pas encore essayé' },
  { value: 'verified', label: 'Vérifié', hint: 'tu l’as essayé, il marche' },
  { value: 'pending', label: 'En attente', hint: 'masqué, à compléter' },
  { value: 'rejected', label: 'Rejeté', hint: 'masqué, ne marche pas' },
];

type Initial = { toolSlug: string; newToolName: string; newToolCategory: string; newToolWebsite: string; creatorName: string; code: string; discount: string; sourceUrl: string; sourceTitle: string; creatorLink: string; status: CodeStatus; note: string };

function initialValues(target: EditorTarget, tools: ToolOption[], categories: Category[]): Initial {
  const empty: Initial = { toolSlug: '', newToolName: '', newToolCategory: categories[0]?.slug ?? '', newToolWebsite: '', creatorName: '', code: '', discount: '', sourceUrl: '', sourceTitle: '', creatorLink: '', status: 'to_test', note: '' };
  if (target.kind === 'edit') {
    const { code } = target;
    return { ...empty, toolSlug: code.toolSlug, creatorName: code.creator, code: code.code, discount: code.discount, sourceUrl: code.source, sourceTitle: code.sourceTitle, creatorLink: code.creatorLink ?? '', status: code.status, note: code.note ?? '' };
  }
  if (target.kind === 'submission') {
    const { submission } = target;
    const tool = tools.find(item => item.name.toLowerCase() === submission.tool_name.trim().toLowerCase());
    const category = categories.find(item => item.name === submission.category);
    return {
      ...empty,
      toolSlug: tool?.slug ?? NEW_TOOL, newToolName: tool ? '' : submission.tool_name, newToolCategory: category?.slug ?? empty.newToolCategory,
      creatorName: submission.creator_name, code: submission.code, discount: submission.discount_label, sourceUrl: submission.source_url, creatorLink: submission.creator_link ?? '',
    };
  }
  return empty;
}

export function CodeEditor({ target, tools, categories, creators, onClose, onSaved }: {
  target: EditorTarget | null; tools: ToolOption[]; categories: Category[]; creators: string[]; onClose: () => void; onSaved?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [values, setValues] = useState<Initial>(() => initialValues(target ?? { kind: 'create' }, tools, categories));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) { dialog.current?.close(); return; }
    setValues(initialValues(target, tools, categories));
    setError('');
    setSaving(false);
    if (!dialog.current?.open) dialog.current?.showModal();
  }, [target, tools, categories]);

  if (!target) return <dialog ref={dialog} className="adm-dialog" onClose={onClose} />;

  const set = <K extends keyof Initial>(key: K) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setValues(current => ({ ...current, [key]: event.target.value }));
  const title = target.kind === 'create' ? 'Nouveau code' : target.kind === 'edit' ? `Modifier ${target.code.code}` : 'Valider la proposition';
  const isNewTool = values.toolSlug === NEW_TOOL;

  async function send(url: string, method: string, body: unknown) {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setError(result.error || 'L’enregistrement a échoué.'); setSaving(false); return; }
      dialog.current?.close();
      onSaved?.();
      router.refresh();
    } catch {
      setError('L’enregistrement a échoué. Vérifie ta connexion.');
      setSaving(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = {
      ...(isNewTool ? { newTool: { name: values.newToolName, categorySlug: values.newToolCategory, website: values.newToolWebsite } } : { toolSlug: values.toolSlug }),
      creatorName: values.creatorName, code: values.code, discount: values.discount, sourceUrl: values.sourceUrl, sourceTitle: values.sourceTitle,
      creatorLink: values.creatorLink, status: values.status, note: values.note,
      ...(target?.kind === 'submission' ? { submissionId: target.submission.id } : {}),
    };
    if (target?.kind === 'edit') void send(`/api/admin/codes/${target.code.id}`, 'PATCH', body);
    else void send('/api/admin/codes', 'POST', body);
  }

  function archive() {
    if (target?.kind !== 'edit') return;
    const restoring = target.code.archived;
    if (!restoring && !window.confirm('Archiver ce code ? Il disparaît du site et des statistiques. Tu pourras le restaurer depuis l’onglet Archivés.')) return;
    void send(`/api/admin/codes/${target.code.id}`, 'PATCH', { action: restoring ? 'restore' : 'archive' });
  }

  return (
    <dialog ref={dialog} className="adm-dialog" aria-labelledby="code-editor-title" onClose={onClose}>
      <form className="adm-form" onSubmit={submit}>
        <div className="adm-dialog-head">
          <h2 id="code-editor-title">{title}</h2>
          <button type="button" className="adm-icon-btn" aria-label="Fermer" onClick={() => dialog.current?.close()}>✕</button>
        </div>
        {target.kind === 'submission' && <p className="adm-dialog-intro">Vérifie et complète la proposition. En l’enregistrant, elle passe en « Validée » et devient un code du catalogue.</p>}

        <div className="adm-form-grid">
          <div className="field">
            <label htmlFor="ce-tool">Outil</label>
            <select id="ce-tool" value={values.toolSlug} onChange={set('toolSlug')} required>
              <option value="" disabled>Choisir un outil…</option>
              {tools.map(tool => <option key={tool.slug} value={tool.slug}>{tool.name} · {tool.category}</option>)}
              <option value={NEW_TOOL}>+ Nouvel outil</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ce-creator">Créateur</label>
            <input id="ce-creator" list="ce-creators" value={values.creatorName} onChange={set('creatorName')} required maxLength={160} placeholder="Nom de la chaîne ou du compte" />
            <datalist id="ce-creators">{creators.map(name => <option key={name} value={name} />)}</datalist>
          </div>
          {isNewTool && (
            <fieldset className="adm-fieldset">
              <legend>Nouvel outil</legend>
              <div className="field"><label htmlFor="ce-tool-name">Nom</label><input id="ce-tool-name" value={values.newToolName} onChange={set('newToolName')} required maxLength={120} /></div>
              <div className="field"><label htmlFor="ce-tool-cat">Catégorie</label><select id="ce-tool-cat" value={values.newToolCategory} onChange={set('newToolCategory')} required>{categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></div>
              <div className="field"><label htmlFor="ce-tool-site">Site officiel</label><input id="ce-tool-site" value={values.newToolWebsite} onChange={set('newToolWebsite')} required placeholder="exemple.com" maxLength={300} /></div>
            </fieldset>
          )}
          <div className="field"><label htmlFor="ce-code">Code</label><input id="ce-code" className="mono" value={values.code} onChange={set('code')} required maxLength={120} /></div>
          <div className="field"><label htmlFor="ce-discount">Réduction</label><input id="ce-discount" value={values.discount} onChange={set('discount')} required maxLength={240} placeholder="-20 %, 3 mois offerts…" /></div>
          <div className="field adm-span-2"><label htmlFor="ce-source">Lien de la source</label><input id="ce-source" type="url" value={values.sourceUrl} onChange={set('sourceUrl')} required maxLength={1000} placeholder="https://… (vidéo, post, story)" /><small>Là où le créateur donne le code. C’est la preuve qu’il est public.</small></div>
          <div className="field"><label htmlFor="ce-source-title">Titre de la source</label><input id="ce-source-title" value={values.sourceTitle} onChange={set('sourceTitle')} maxLength={300} /></div>
          <div className="field"><label htmlFor="ce-link">Lien du créateur (facultatif)</label><input id="ce-link" type="url" value={values.creatorLink} onChange={set('creatorLink')} maxLength={1000} placeholder="https://…" /><small>Son lien d’affiliation, ouvert tel quel.</small></div>
          <div className="field adm-span-2">
            <span className="adm-field-label" id="ce-status-label">Statut</span>
            <div className="adm-status-choice" role="radiogroup" aria-labelledby="ce-status-label">
              {statusOptions.map(option => (
                <label key={option.value} className="adm-status-option">
                  <input type="radio" name="status" value={option.value} checked={values.status === option.value} onChange={set('status')} />
                  <span><b>{option.label}</b><small>{option.hint}</small></span>
                </label>
              ))}
            </div>
          </div>
          <div className="field adm-span-2"><label htmlFor="ce-note">Note interne (facultative)</label><textarea id="ce-note" rows={2} value={values.note} onChange={set('note')} maxLength={1000} /></div>
        </div>

        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <div className="adm-dialog-foot">
          {target.kind === 'edit' && <button type="button" className="adm-btn adm-btn-danger" onClick={archive} disabled={saving}>{target.code.archived ? 'Restaurer' : 'Archiver'}</button>}
          <span style={{ flex: 1 }} />
          <button type="button" className="adm-btn" onClick={() => dialog.current?.close()}>Annuler</button>
          <button type="submit" className="adm-btn adm-btn-pri" disabled={saving}>{saving ? 'Enregistrement…' : target.kind === 'submission' ? 'Valider et créer le code' : 'Enregistrer'}</button>
        </div>
      </form>
    </dialog>
  );
}
