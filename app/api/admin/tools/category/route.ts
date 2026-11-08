import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { aiConfigFrom, anthropicCreate } from '@/lib/ai-extract';
import { readJsonBody } from '@/lib/http';
import { suggestToolCategory } from '@/lib/tool-category-ai';

// Lecture du site puis un appel à l'IA.
export const maxDuration = 60;

// « Trouver la catégorie » : { name, website } → résumé et catégorie proposée (existante ou nouvelle). Rien n'est enregistré.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 1_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const config = aiConfigFrom(process.env);
    const result = await suggestToolCategory(getDb(), { ai: { config, create: config.apiKey ? anthropicCreate(config.apiKey) : null } }, parsed.data as Record<string, unknown>);
    return result.ok ? NextResponse.json({ ok: true, analysis: result.data }) : NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error('tool category suggestion failed', error);
    return NextResponse.json({ error: 'Analyse impossible pour le moment.' }, { status: 500 });
  }
}
