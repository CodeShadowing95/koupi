import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { buildCommandIndex } from '@/lib/admin-command';
import { listCreatorsAdmin, listToolsAdmin } from '@/lib/catalog-admin';
import { loadCatalog } from '@/lib/catalog-db';
import { listSubmissions } from '@/lib/submissions';

export const dynamic = 'force-dynamic';

// GET /api/admin/search-index : tout ce que la recherche globale (⌘K) peut trouver, en une réponse.
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const db = getDb();
    const [catalog, tools, creators, proposals] = await Promise.all([
      loadCatalog(db, { includeArchived: true }), listToolsAdmin(db), listCreatorsAdmin(db), listSubmissions(db, { status: 'new' }),
    ]);
    const items = buildCommandIndex({ codes: catalog.codes, tools, creators, proposals });
    return NextResponse.json({ items }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('search index failed', error);
    return NextResponse.json({ error: 'La recherche est indisponible.' }, { status: 500 });
  }
}
