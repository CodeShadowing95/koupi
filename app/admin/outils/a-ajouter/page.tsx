import { getDb } from '@/db';
import { aiConfigFrom, aiStatusOf } from '@/lib/ai-extract';
import { listCategoriesAdmin } from '@/lib/catalog-admin';
import { toolOptions } from '@/lib/codes-admin';
import { listToolSuggestions } from '@/lib/tool-suggestions';
import { aiSpendSince, startOfMonthUtc } from '@/lib/verification-store';
import { RefreshButton } from '@/components/admin-refresh-button';
import { ToolSuggestionsPanel } from './tool-suggestions-panel';

export const metadata = { title: 'Outils à ajouter · Admin Merkod' };

export const dynamic = 'force-dynamic';

// Codes trouvés (podcasts, vidéos YouTube, analyses) pour des outils absents du catalogue : l'admin ajoute l'outil,
// le relie à un outil existant, ou ignore. Avant, c'était un onglet de Podcasts suivis.
export default async function Page() {
  const db = getDb();
  const [suggestions, categories, tools, spent] = await Promise.all([listToolSuggestions(db), listCategoriesAdmin(db), toolOptions(db), aiSpendSince(db, startOfMonthUtc())]);
  const ai = aiStatusOf(aiConfigFrom(process.env), spent);
  return (
    <main className="adm-page">
      <div className="container">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Catalogue</span>
            <h1>Outils à ajouter</h1>
            <p>Merkod a trouvé des codes pour ces outils, mais ils ne sont pas encore dans le catalogue. Ajoute l’outil (ou relie-le à un outil déjà suivi) : ses codes partent en attente dans Vérifications. Sinon, ignore-le.</p>
          </div>
          <div className="adm-head-actions"><RefreshButton /></div>
        </div>
        <ToolSuggestionsPanel suggestions={suggestions} categories={categories.map(category => ({ slug: category.slug, name: category.name }))} tools={tools} ai={{ active: ai.state === 'active', label: ai.label }} />
      </div>
    </main>
  );
}
