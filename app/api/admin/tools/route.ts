import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { createTool, parseToolInput } from '@/lib/catalog-admin';
import { revalidateCatalog } from '@/lib/catalog-server';
import { readJsonBody } from '@/lib/http';

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 4_000);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const input = parseToolInput(parsed.data);
    if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
    const result = await createTool(getDb(), input.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('tool create failed', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer cet outil.' }, { status: 500 });
  }
}
