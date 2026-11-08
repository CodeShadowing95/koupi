'use client';
// « Trouver la catégorie » dans la fiche d'un outil et dans « Nouvel outil » en validant un code : l'IA lit le site officiel et choisit la catégorie (ADR-0024).
// Rien n'est enregistré ici : la fiche est remplie, l'admin valide. Grisé quand l'IA est coupée ou son plafond atteint.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ToolAnalysis } from '@/lib/tool-analysis';
import { applyToolAnalysis, type ToolFormFields } from '@/lib/tool-form-fill';
import { slugify } from '@/lib/slug';

export function CategoryFinder({ form, categories, ai, onFill, hint = 'Lit le site officiel et remplit la catégorie, et la description si elle est vide.' }: {
  form: ToolFormFields;
  hint?: string;
  categories: { slug: string; name: string }[];
  ai: { active: boolean; label: string };
  onFill: (next: ToolFormFields) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'read' | 'create' | null>(null);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<ToolAnalysis | null>(null);
  const nameOf = (slug: string) => categories.find(category => category.slug === slug)?.name ?? slug;
  const noSite = !form.website.trim();

  async function find() {
    setBusy('read');
    setError('');
    try {
      const response = await fetch('/api/admin/tools/category', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.name, website: form.website }) });
      const body = await response.json().catch(() => ({})) as { analysis?: ToolAnalysis; error?: string };
      if (!response.ok || !body.analysis) setError(body.error || 'Analyse impossible pour le moment.');
      else { setAnalysis(body.analysis); onFill(applyToolAnalysis(form, body.analysis)); }
    } catch {
      setError('Analyse impossible. Vérifie ta connexion.');
    }
    setBusy(null);
  }

  // Une catégorie du même nom existe déjà (créée entre-temps, ou écrite autrement) : on la choisit sans en créer une autre.
  const sameName = (name: string) => categories.find(category => slugify(category.name) === slugify(name));

  async function createCategory(name: string) {
    const existing = sameName(name);
    if (existing) {
      onFill({ ...form, categorySlug: existing.slug });
      setAnalysis(value => value && { ...value, categorySlug: existing.slug, newCategory: '', reason: 'catégorie déjà au catalogue.' });
      return;
    }
    setBusy('create');
    setError('');
    try {
      const response = await fetch('/api/admin/categories', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
      const body = await response.json().catch(() => ({})) as { slug?: string; error?: string };
      if (!response.ok || !body.slug) setError(body.error || 'La catégorie n’a pas pu être créée.');
      else { onFill({ ...form, categorySlug: body.slug }); setAnalysis(value => value && { ...value, categorySlug: body.slug!, newCategory: '', reason: 'catégorie créée à l’instant.' }); router.refresh(); }
    } catch {
      setError('La catégorie n’a pas pu être créée. Vérifie ta connexion.');
    }
    setBusy(null);
  }

  const title = !ai.active ? `${ai.label} : choisis la catégorie à la main.` : noSite ? 'Indique d’abord le site officiel.' : 'L’IA lit la page d’accueil du site et choisit la catégorie';
  return (
    <div className="field adm-span-2 adm-cat-finder">
      <div className="adm-cat-finder-row">
        <button type="button" className="adm-btn adm-sugg-ai" disabled={!ai.active || noSite || busy !== null} title={title} onClick={find}>
          {busy === 'read' ? 'Lecture du site…' : analysis ? 'Relancer la lecture' : '✦ Trouver la catégorie'}
        </button>
        <small>{!ai.active ? title : hint}</small>
      </div>
      {error && <p className="adm-cat-finder-error" role="alert">{error}</p>}
      {analysis && (
        <div className="adm-sugg-analysis" aria-live="polite">
          <p>{analysis.summary}</p>
          {!analysis.isOnlineTool && <p className="adm-sugg-warn">L’IA pense que ce n’est pas un outil en ligne.</p>}
          {analysis.categorySlug
            ? <p className="muted">Catégorie choisie : <b>{nameOf(analysis.categorySlug)}</b>{analysis.reason ? ` · ${analysis.reason}` : ''}</p>
            : analysis.newCategory
              ? <p className="adm-cat-finder-new">Aucune catégorie ne convient. L’IA propose <b>{analysis.newCategory}</b>.
                  <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => createCategory(analysis.newCategory)}>{busy === 'create' ? 'Création…' : sameName(analysis.newCategory) ? `Choisir « ${analysis.newCategory} »` : `Créer « ${analysis.newCategory} »`}</button></p>
              : <p className="muted">Aucune catégorie proposée : choisis-la à la main.</p>}
        </div>
      )}
    </div>
  );
}
