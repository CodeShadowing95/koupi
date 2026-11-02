import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { buildNotifications } from '@/lib/admin-notifications';
import { loadCatalog } from '@/lib/catalog-db';
import { listSubmissions } from '@/lib/submissions';

export const dynamic = 'force-dynamic';

// GET /api/admin/notifications : ce que la cloche de la barre du haut affiche.
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const db = getDb();
    const [catalog, proposals] = await Promise.all([loadCatalog(db), listSubmissions(db, { status: 'new' })]);
    return NextResponse.json({ items: buildNotifications({ proposals, codes: catalog.codes }) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('admin notifications failed', error);
    return NextResponse.json({ error: 'Les notifications sont indisponibles.' }, { status: 500 });
  }
}
