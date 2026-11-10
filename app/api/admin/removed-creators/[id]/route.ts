import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest, UUID_PATTERN } from '@/lib/admin-guard';
import { unremoveCreator } from '@/lib/removed-creators';

/** Sort un créateur de la liste des créateurs retirés (ADR-0050), quand il a écrit qu'il veut revenir. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Ligne invalide.' }, { status: 400 });
  try {
    if (!(await unremoveCreator(getDb(), id))) return NextResponse.json({ error: 'Ce créateur n’est plus dans la liste.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('creator unremove failed', error);
    return NextResponse.json({ error: 'Le changement n’a pas pu être enregistré.' }, { status: 500 });
  }
}
