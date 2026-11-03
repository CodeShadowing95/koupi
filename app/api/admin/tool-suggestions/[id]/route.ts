import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { parseToolInput } from '@/lib/catalog-admin';
import { revalidateCatalog } from '@/lib/catalog-server';
import { readJsonBody } from '@/lib/http';
import { acceptToolSuggestion, ignoreToolSuggestion, type AcceptTarget } from '@/lib/tool-suggestions';
import { runVerification } from '@/lib/verification-run';
import { verificationDeps } from '@/lib/verification-deps';

export const maxDuration = 60;

// Outil à ajouter :
// { action: 'ignore' } la met de côté pour de bon ;
// { action: 'add', newTool: { name, categorySlug, website, priority? } } crée l'outil ;
// { action: 'add', toolSlug } la relie à un outil déjà au catalogue.
// Les codes créés arrivent en attente et leur dossier de vérification est préparé.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Suggestion invalide.' }, { status: 400 });
  const parsed = await readJsonBody(request, 4_000);
  if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
  const body = parsed.data;
  try {
    const db = getDb();
    if (body.action === 'ignore') {
      return await ignoreToolSuggestion(db, id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Suggestion introuvable ou déjà traitée.' }, { status: 404 });
    }
    if (body.action !== 'add') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });

    let target: AcceptTarget;
    if (typeof body.toolSlug === 'string' && body.toolSlug) {
      target = { toolSlug: body.toolSlug.slice(0, 120) };
    } else if (body.newTool && typeof body.newTool === 'object' && !Array.isArray(body.newTool)) {
      const input = parseToolInput(body.newTool as Record<string, unknown>);
      if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
      target = { newTool: input.data };
    } else {
      return NextResponse.json({ error: 'Choisis un outil ou crée-le.' }, { status: 400 });
    }

    const result = await acceptToolSuggestion(db, id, target);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    revalidateCatalog();
    const deps = verificationDeps();
    for (const codeId of result.data.codeIds) await runVerification(db, codeId, deps).catch(error => console.error('suggested code verification failed', error));
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('tool suggestion failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce choix.' }, { status: 500 });
  }
}
