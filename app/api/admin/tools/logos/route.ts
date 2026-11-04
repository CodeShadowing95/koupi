import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { readJsonBody } from '@/lib/http';
import { revalidateCatalog } from '@/lib/catalog-server';
import { refreshToolLogos } from '@/lib/stored-images';

export const maxDuration = 60;

/** Outils traités par appel : l'admin enchaîne les appels tant qu'il en reste. */
const BATCH = 20;

// Logos des outils (ADR-0027) : Logo.dev si LOGO_DEV_TOKEN est défini, sinon l'icône du site de la marque.
// Avec toolId : actualise le logo de cet outil. Sans : récupère ceux qui manquent, par lots (skip = échecs déjà vus).
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const parsed = await readJsonBody(request, 2_000);
  const data = parsed.ok ? parsed.data : {};
  const toolId = typeof data.toolId === 'string' ? data.toolId : '';
  if (toolId && !/^[0-9a-f-]{36}$/i.test(toolId)) return NextResponse.json({ error: 'Outil inconnu.' }, { status: 400 });
  const skip = typeof data.skip === 'number' && Number.isInteger(data.skip) && data.skip >= 0 && data.skip <= 10_000 ? data.skip : 0;
  try {
    const logoDevToken = process.env.LOGO_DEV_TOKEN || undefined;
    const report = await refreshToolLogos(getDb(), toolId ? { onlyToolId: toolId, logoDevToken } : { missingOnly: true, limit: BATCH, skip, logoDevToken });
    if (report.updated.length) revalidateCatalog();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error('tool logos refresh failed', error);
    return NextResponse.json({ error: 'La récupération des logos a échoué. Réessaie dans un moment.' }, { status: 502 });
  }
}
