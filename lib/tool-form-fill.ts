// Remplissage de la fiche d'un outil à partir de la lecture de son site (« Trouver la catégorie ») et alerte doublon.
// Sans base ni réseau : importable par les composants client.
import type { ToolAnalysis } from './tool-analysis';
import { slugify } from './slug';

export type ToolFormFields = { name: string; categorySlug: string; website: string; description: string; priority: number };

/** Description de la fiche : 300 caractères au plus, coupée à la fin d'une phrase quand c'est possible. */
export function shortDescription(summary: string, max = 300): string {
  const clean = summary.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = cut.lastIndexOf('. ');
  return end > 60 ? cut.slice(0, end + 1) : `${cut.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Ce que la lecture change dans la fiche : la catégorie choisie, la description si elle est vide, et le nom quand le
 * site l'écrit autrement (« N8N » → « n8n »), jamais un nom différent tapé par l'admin.
 */
export function applyToolAnalysis(form: ToolFormFields, analysis: ToolAnalysis): ToolFormFields {
  const sameName = analysis.toolName && (!form.name.trim() || slugify(form.name) === slugify(analysis.toolName));
  return {
    ...form,
    ...(analysis.categorySlug ? { categorySlug: analysis.categorySlug } : {}),
    ...(!form.description.trim() && analysis.summary ? { description: shortDescription(analysis.summary) } : {}),
    ...(sameName ? { name: analysis.toolName } : {}),
  };
}

/** Domaine d'une adresse tapée (« https://www.n8n.io/pricing » → « n8n.io »), null si elle n'en a pas. */
export function websiteDomain(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase().replace(/^www\./, '');
    return host.includes('.') ? host : null;
  } catch {
    return null;
  }
}

/** Outil du catalogue qui a déjà ce site (archivés compris), autre que celui qu'on modifie. */
export function toolWithSameSite<T extends { id: string; website: string }>(tools: T[], website: string, exceptId?: string): T | null {
  const domain = websiteDomain(website);
  if (!domain) return null;
  return tools.find(tool => tool.id !== exceptId && websiteDomain(tool.website) === domain) ?? null;
}
