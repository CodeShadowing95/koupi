import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { revalidateCatalog } from '@/lib/catalog-server';
import { readJsonBody } from '@/lib/http';
import { mergeTool } from '@/lib/tool-merge';

// « Fusionner dans… » : { into } = l'outil qui garde les codes. L'outil de l'adresse est archivé.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Outil invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 500);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const into = typeof parsed.data.into === 'string' ? parsed.data.into : '';
    if (!UUID_PATTERN.test(into)) return NextResponse.json({ error: 'Choisis un outil du catalogue.' }, { status: 400 });
    const result = await mergeTool(getDb(), id, into);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Outil introuvable.' ? 404 : 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('tool merge failed', error);
    return NextResponse.json({ error: 'La fusion a échoué. Réessaie : elle reprend là où elle s’est arrêtée.' }, { status: 500 });
  }
}
