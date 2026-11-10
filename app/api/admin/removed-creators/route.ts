import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { addRemovedCreator } from '@/lib/removed-creators';

/** Ajoute à la main un créateur à la liste des créateurs retirés (ADR-0050). */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 1_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await addRemovedCreator(getDb(), parsed.data.name, parsed.data.channelId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('creator remove failed', error);
    return NextResponse.json({ error: 'Le changement n’a pas pu être enregistré.' }, { status: 500 });
  }
}
