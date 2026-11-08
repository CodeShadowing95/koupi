'use client';
// Dans un dossier de Vérifications : l'IA rattache le code à une autre marque que son outil.
// L'admin choisit l'outil du catalogue (présélectionné quand la marque y est) et rattache le code d'un clic.
import { useState } from 'react';
import { AdminSelect } from '@/components/admin-select';
import { catalogMatch, type PickerTool } from '@/lib/verification-display';

export function ToolPicker({ codeId, currentSlug, currentName, aiTool, tools, disabled, onMoved }: {
  codeId: string; currentSlug: string; currentName: string; aiTool: string; tools: PickerTool[]; disabled: boolean;
  onMoved: (toolName: string) => void;
}) {
  const [slug, setSlug] = useState(() => catalogMatch(tools, aiTool, currentSlug));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const known = catalogMatch(tools, aiTool, currentSlug) !== '';

  async function move() {
    setSaving(true);
    setError('');
    const response = await fetch(`/api/admin/codes/${codeId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ moveTo: slug }) }).catch(() => null);
    const body = await response?.json().catch(() => ({})) as { tool?: string; error?: string } | undefined;
    setSaving(false);
    if (!response?.ok) { setError(body?.error || 'Le changement d’outil n’a pas pu être enregistré.'); return; }
    onMoved(body?.tool ?? '');
  }

  return (
    <div className="adm-vf-tool" onClick={event => event.stopPropagation()}>
      <span className="adm-vf-tool-label">Rattacher à</span>
      <AdminSelect id={`vf-tool-${codeId}`} variant="filter" ariaLabel="Outil auquel rattacher le code" value={slug} onChange={setSlug}
        options={tools.filter(tool => tool.slug !== currentSlug).map(tool => ({ value: tool.slug, label: tool.name }))}
        placeholder="Choisir un outil…" searchPlaceholder="Rechercher un outil…" />
      <button type="button" className="adm-btn" disabled={disabled || saving || !slug} title={slug ? `Le code quitte ${currentName} pour l’outil choisi, puis le dossier est réanalysé` : 'Choisis d’abord un outil'} onClick={move}>
        {saving ? 'Rattachement…' : 'Rattacher'}
      </button>
      {!known && <small className="adm-vf-tool-note">« {aiTool} » n’est pas au catalogue : ajoute-le dans Outils pour pouvoir l’y rattacher, ou choisis un autre outil.</small>}
      {error && <small className="adm-vf-tool-error" role="alert">{error}</small>}
    </div>
  );
}
