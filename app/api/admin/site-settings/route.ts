import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { revalidateCatalog } from '@/lib/catalog-server';
import { setSiteSwitch } from '@/lib/site-settings';
import { revalidateSiteState } from '@/lib/site-settings-server';

// Allume ou coupe une page publique, ou met le site en pause : { target: "<clé de page>" | "maintenance", enabled }.
export async function PATCH(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const parsed = await readJsonBody(request, 500);
    if (!parsed.ok) return NextResponse.json({ error: 'Requête invalide.' }, { status: parsed.status });
    const result = await setSiteSwitch(getDb(), parsed.data as Record<string, unknown>);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    revalidateSiteState();
    revalidateCatalog();
    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    console.error('site switch failed', error);
    return NextResponse.json({ error: 'Le changement n’a pas pu être enregistré.' }, { status: 500 });
  }
}
