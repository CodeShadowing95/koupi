import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { parseToolInput, setToolArchived, updateTool } from '@/lib/catalog-admin';
import { revalidateCatalog } from '@/lib/catalog-server';
import { readJsonBody } from '@/lib/http';

// { archived: true | false } pour archiver ou restaurer, sinon le formulaire complet de l'outil.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Outil invalide.' }, { status: 400 });
  try {
    const parsed = await readJsonBody(request, 4_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const db = getDb();
    if (typeof parsed.data.archived === 'boolean') {
      if (!(await setToolArchived(db, id, parsed.data.archived))) return NextResponse.json({ error: 'Outil introuvable.' }, { status: 404 });
    } else {
      const input = parseToolInput(parsed.data);
      if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
      const result = await updateTool(db, id, input.data);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Outil introuvable.' ? 404 : 400 });
    }
    revalidateCatalog();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('tool update failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce changement.' }, { status: 500 });
  }
}
