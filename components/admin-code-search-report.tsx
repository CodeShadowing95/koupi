'use client';
// Compte rendu d'une recherche de codes sur YouTube (page Catégories, panneau d'un outil) : ce qui a été lu,
// ce que ça a coûté et les codes trouvés, mis en attente dans Vérifications.
import Link from 'next/link';
import type { CategorySearchReport } from '@/lib/category-code-search';

/** Ce que la recherche de codes peut utiliser : la clé YouTube (obligatoire) et l'IA (facultative). */
export type CodeSearchAvailability = { youtube: boolean; ai: { active: boolean; label: string } };
export type CodeSearchResult = CategorySearchReport & { scope: string };

export const plural = (count: number, word: string, many = `${word}s`) => `${count} ${count > 1 ? many : word}`;

/** Lance la recherche et rend le compte rendu, ou un message d'erreur lisible. */
export async function runCodeSearch(url: string, body: object, scope: string): Promise<{ result: CodeSearchResult } | { error: string }> {
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { error: data.error ?? 'Recherche impossible pour le moment.' };
    return { result: { ...data, scope } };
  } catch {
    return { error: 'Recherche impossible : vérifie ta connexion.' };
  }
}

/** Formulations employées (« code promo », « promo code »…), sans doublon. */
function variantsLabel(variants: string[] | undefined) {
  const unique = [...new Set(variants ?? [])];
  return unique.length ? ` (${unique.map(variant => `« ${variant} »`).join(', ')})` : '';
}

/** « 5 nouvelles chaînes, 12 déjà connues, 3 vidéos déjà lues écartées. » */
export function newsLabel(result: Pick<CategorySearchReport, 'newChannels' | 'knownChannels' | 'skipped'>) {
  const parts = [plural(result.newChannels ?? 0, 'nouvelle chaîne', 'nouvelles chaînes'), `${result.knownChannels ?? 0} déjà connue${(result.knownChannels ?? 0) > 1 ? 's' : ''}`];
  if (result.skipped > 0) parts.push(`${plural(result.skipped, 'vidéo déjà lue écartée', 'vidéos déjà lues écartées')}`);
  return `${parts.join(', ')}.`;
}

export function CodeSearchReport({ result, onClose }: { result: CodeSearchResult; onClose: () => void }) {
  return (
    <div className={`notice adm-pod-report${result.searches === 0 && result.failed.length > 0 ? ' notice-error' : ''}`} role="status">
      <p>Recherche pour {result.scope} : {plural(result.searches, 'recherche')} YouTube{variantsLabel(result.variants)}, {plural(result.videos, 'nouvelle vidéo lue', 'nouvelles vidéos lues')}{result.aiRead > 0 ? `, dont ${result.aiRead} relue${result.aiRead > 1 ? 's' : ''} par l’IA` : ''}, environ {result.units} unités du quota du jour (10 000).</p>
      <p>{newsLabel(result)} {result.found.length === 0 ? 'Aucun nouveau code trouvé.' : `${plural(result.found.length, 'nouveau code', 'nouveaux codes')} en attente :`}</p>
      {result.found.length > 0 && <ul>{result.found.map(item => <li key={`${item.tool}-${item.code}`}><b className="mono">{item.code}</b> pour {item.tool} <span className="muted">({item.creator})</span></li>)}</ul>}
      {result.suggested.length > 0 && <p>{plural(result.suggested.length, 'code')} pour des outils absents du catalogue : {result.suggested.map(item => `${item.code} (${item.tool})`).join(', ')}. <a href="/admin/outils/a-ajouter">Voir les outils à ajouter</a></p>}
      {result.remaining > 0 && <p>{plural(result.remaining, 'outil')} pas encore cherché{result.remaining > 1 ? 's' : ''} : relance demain pour garder du quota.</p>}
      {result.failed.length > 0 && <p>YouTube n’a pas répondu pour : {result.failed.join(', ')}.</p>}
      <div className="adm-pod-report-actions">
        {result.found.length > 0 && <Link href="/admin/verifications" className="adm-btn adm-btn-pri">Ouvrir les vérifications</Link>}
        <button type="button" className="adm-btn" onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}
