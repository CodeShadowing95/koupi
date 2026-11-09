import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { aiConfigFrom, anthropicCreate } from '@/lib/ai-extract';
import { readJsonBody } from '@/lib/http';
import { sortToolsByUniverse } from '@/lib/universes-admin';

export const maxDuration = 120;

// « ✦ Ranger par univers » : { offset } → marques d'un lot que l'IA range hors des outils en ligne. Rien n'est enregistré.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 200);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const config = aiConfigFrom(process.env);
    const result = await sortToolsByUniverse(getDb(), { ai: { config, create: config.apiKey ? anthropicCreate(config.apiKey) : null } }, parsed.data.offset);
    return result.ok ? NextResponse.json({ ok: true, ...result.data }) : NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error('universe sort failed', error);
    return NextResponse.json({ error: 'La lecture par l’IA a échoué. Réessaie dans un moment.' }, { status: 500 });
  }
}
