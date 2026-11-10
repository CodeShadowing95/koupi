import { NextRequest, NextResponse, after } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { parseToolInput } from '@/lib/catalog-admin';
import { revalidateCatalog } from '@/lib/catalog-server';
import { readJsonBody } from '@/lib/http';
import { aiConfigFrom, anthropicCreate } from '@/lib/ai-extract';
import { MAX_DESCRIPTION, acceptToolSuggestion, analyzeToolSuggestion, ignoreToolSuggestion, type AcceptTarget } from '@/lib/tool-suggestions';
import { runVerification } from '@/lib/verification-run';
import { verificationDeps } from '@/lib/verification-deps';

// L'ajout répond tout de suite ; les dossiers de vérification se préparent ensuite (after), dans la même limite de temps.
export const maxDuration = 300;

// Outil à ajouter :
// { action: 'ignore' } la met de côté pour de bon ;
// { action: 'analyze', website?, description? } fait lire le site par l'IA (résumé, catégorie proposée, ADR-0024),
// ou la description collée par l'admin quand le site refuse les robots ;
// { action: 'add', newTool: { name, categorySlug, website, priority? }, newCategory?, universe? } crée l'outil (et sa catégorie,
// rangée dans l'univers donné) ;
// { action: 'add', toolSlug } la relie à un outil déjà au catalogue.
// Les codes créés arrivent en attente et leur dossier de vérification est préparé.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Suggestion invalide.' }, { status: 400 });
  const parsed = await readJsonBody(request, 12_000);
  if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
  const body = parsed.data;
  try {
    const db = getDb();
    if (body.action === 'ignore') {
      return await ignoreToolSuggestion(db, id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Suggestion introuvable ou déjà traitée.' }, { status: 404 });
    }
    if (body.action === 'analyze') {
      const config = aiConfigFrom(process.env);
      const website = typeof body.website === 'string' ? body.website.slice(0, 300) : undefined;
      const description = typeof body.description === 'string' ? body.description.slice(0, MAX_DESCRIPTION) : undefined;
      const result = await analyzeToolSuggestion(db, id, { ai: { config, create: config.apiKey ? anthropicCreate(config.apiKey) : null } }, { website, description });
      return result.ok ? NextResponse.json({ ok: true, analysis: result.data }) : NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (body.action !== 'add') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });

    let target: AcceptTarget;
    if (typeof body.toolSlug === 'string' && body.toolSlug) {
      target = { toolSlug: body.toolSlug.slice(0, 120) };
    } else if (body.newTool && typeof body.newTool === 'object' && !Array.isArray(body.newTool)) {
      const newCategory = typeof body.newCategory === 'string' ? body.newCategory.trim().slice(0, 80) : '';
      // Une nouvelle catégorie remplace le choix dans la liste : on la crée avec l'outil.
      const input = parseToolInput({ ...(body.newTool as Record<string, unknown>), ...(newCategory ? { categorySlug: 'nouvelle' } : {}) });
      if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
      const universe = newCategory && typeof body.universe === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(body.universe) ? body.universe.slice(0, 60) : '';
      target = { newTool: input.data, ...(newCategory ? { newCategory } : {}), ...(universe ? { universe } : {}) };
    } else {
      return NextResponse.json({ error: 'Choisis un outil ou crée-le.' }, { status: 400 });
    }

    const result = await acceptToolSuggestion(db, id, target);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    revalidateCatalog();
    // Lire la source et passer l'IA prend plusieurs secondes par code : l'admin n'attend pas, le dossier arrive dans Vérifications.
    const { codeIds } = result.data;
    after(async () => {
      const deps = verificationDeps();
      for (const codeId of codeIds) await runVerification(db, codeId, deps).catch(error => console.error('suggested code verification failed', error));
    });
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('tool suggestion failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce choix.' }, { status: 500 });
  }
}
