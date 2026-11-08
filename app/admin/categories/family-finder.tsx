'use client';
// « ✦ Trouver la famille » dans la fiche d'une catégorie : l'IA choisit une famille existante, ou propose
// d'en créer une. Rien n'est enregistré ici sauf la nouvelle famille, sur clic ; l'admin enregistre la fiche.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FamilySuggestion } from '@/lib/category-family-ai';
import { slugify } from '@/lib/slug';

export function FamilyFinder({ name, slug, families, ai, onPick }: {
  name: string;
  /** Slug de la catégorie modifiée, pour donner ses outils à l'IA ; absent pour une nouvelle catégorie. */
  slug?: string;
  families: { slug: string; name: string }[];
  ai: { active: boolean; label: string };
  onPick: (family: { slug: string; name: string }) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'read' | 'create' | null>(null);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<FamilySuggestion | null>(null);
  const nameOf = (familySlug: string) => families.find(family => family.slug === familySlug)?.name ?? familySlug;
  const noName = !name.trim();

  async function find() {
    setBusy('read');
    setError('');
    try {
      const response = await fetch('/api/admin/categories/family', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, slug }) });
      const body = await response.json().catch(() => ({})) as { suggestion?: FamilySuggestion; error?: string };
      if (!response.ok || !body.suggestion) setError(body.error || 'Suggestion impossible pour le moment.');
      else {
        setSuggestion(body.suggestion);
        if (body.suggestion.familySlug) onPick({ slug: body.suggestion.familySlug, name: nameOf(body.suggestion.familySlug) });
      }
    } catch {
      setError('Suggestion impossible. Vérifie ta connexion.');
    }
    setBusy(null);
  }

  async function create(familyName: string) {
    // Une famille du même nom existe déjà (créée entre-temps) : on la choisit sans en créer une autre.
    const existing = families.find(family => slugify(family.name) === slugify(familyName));
    if (existing) { onPick(existing); setSuggestion(value => value && { ...value, familySlug: existing.slug, newFamily: '' }); return; }
    setBusy('create');
    setError('');
    try {
      const response = await fetch('/api/admin/families', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: familyName }) });
      const body = await response.json().catch(() => ({})) as { slug?: string; name?: string; error?: string };
      if (!response.ok || !body.slug) setError(body.error || 'La famille n’a pas pu être créée.');
      else {
        onPick({ slug: body.slug, name: body.name ?? familyName });
        setSuggestion(value => value && { ...value, familySlug: body.slug!, newFamily: '', reason: 'famille créée à l’instant.' });
        router.refresh();
      }
    } catch {
      setError('La famille n’a pas pu être créée. Vérifie ta connexion.');
    }
    setBusy(null);
  }

  const title = !ai.active ? `${ai.label} : choisis la famille à la main.` : noName ? 'Indique d’abord le nom de la catégorie.' : 'L’IA lit le nom de la catégorie et de ses outils, et choisit la famille';
  return (
    <div className="field adm-span-2 adm-cat-finder">
      <div className="adm-cat-finder-row">
        <button type="button" className="adm-btn adm-sugg-ai" disabled={!ai.active || noName || busy !== null} title={title} onClick={find}>
          {busy === 'read' ? 'Recherche…' : suggestion ? 'Relancer' : '✦ Trouver la famille'}
        </button>
        <small>{!ai.active ? title : 'Choisit la famille d’après le nom de la catégorie et ses outils, ou en propose une nouvelle.'}</small>
      </div>
      {error && <p className="adm-cat-finder-error" role="alert">{error}</p>}
      {suggestion && (
        <div className="adm-sugg-analysis" aria-live="polite">
          {suggestion.familySlug
            ? <p className="muted">Famille choisie : <b>{nameOf(suggestion.familySlug)}</b>{suggestion.reason ? ` · ${suggestion.reason}` : ''}</p>
            : <p className="adm-cat-finder-new">Aucune famille ne convient. L’IA propose <b>{suggestion.newFamily}</b>{suggestion.reason ? <span className="muted"> · {suggestion.reason}</span> : null}
                <button type="button" className="adm-btn" disabled={busy !== null} onClick={() => create(suggestion.newFamily)}>{busy === 'create' ? 'Création…' : `Créer « ${suggestion.newFamily} »`}</button></p>}
        </div>
      )}
    </div>
  );
}
