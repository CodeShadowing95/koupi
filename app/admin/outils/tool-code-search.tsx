'use client';
// « Chercher des codes » dans le panneau d'un outil : une recherche YouTube pour cet outil seul, avec une formulation nouvelle à chaque fois (lib/youtube-queries.ts).
// Les codes trouvés arrivent « En attente » dans Vérifications ; rien n'est publié.
import { useState } from 'react';
import { CodeSearchReport, runCodeSearch, type CodeSearchResult } from '@/components/admin-code-search-report';
// Même valeur que SEARCH_UNITS (lib/category-code-search.ts), qui lit la base et ne peut pas venir côté navigateur.
const SEARCH_UNITS = 100;

export function ToolCodeSearch({ toolId, toolName, archived, youtubeReady }: { toolId: string; toolName: string; archived: boolean; youtubeReady: boolean }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CodeSearchResult | null>(null);
  const [error, setError] = useState('');
  const disabledReason = !youtubeReady ? 'La clé YouTube manque (YOUTUBE_API_KEY)' : archived ? 'Restaure l’outil pour lui chercher des codes' : null;

  async function search() {
    setBusy(true);
    setError('');
    setResult(null);
    const outcome = await runCodeSearch(`/api/admin/tools/${toolId}/search-codes`, {}, toolName);
    if ('error' in outcome) setError(outcome.error);
    else setResult(outcome.result);
    setBusy(false);
  }

  return (
    <div className="adm-tool-search">
      <div className="adm-tool-search-row">
        <button type="button" className="adm-btn" disabled={busy || disabledReason !== null} title={disabledReason ?? `Cherche des codes pour ${toolName} sur YouTube, en écartant les vidéos déjà lues (environ ${SEARCH_UNITS} unités du quota du jour)`} onClick={search}>
          {busy ? 'Recherche…' : 'Chercher des codes'}
        </button>
        <small className="muted">{disabledReason ?? `Une recherche YouTube, environ ${SEARCH_UNITS} unités sur 10 000 par jour.`}</small>
      </div>
      {busy && <div className="notice" role="status">Recherche sur YouTube pour {toolName}… Cela peut prendre une minute.</div>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {result && <CodeSearchReport result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
