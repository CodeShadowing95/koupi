import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { buildNotifications } from '@/lib/admin-notifications';
import { loadCatalog } from '@/lib/catalog-db';
import { listCreatorRequests } from '@/lib/creator-requests';
import { listFeedback } from '@/lib/feedback';
import { listSubmissions } from '@/lib/submissions';

export const dynamic = 'force-dynamic';

// GET /api/admin/notifications : ce que la cloche de la barre du haut affiche.
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const db = getDb();
    const [catalog, proposals, requests, feedback] = await Promise.all([loadCatalog(db), listSubmissions(db, { status: 'new' }), listCreatorRequests(db), listFeedback(db)]);
    const items = buildNotifications({
      proposals, codes: catalog.codes,
      requests: requests.filter(item => item.status === 'new').map(item => ({ id: item.id, kind: item.kind, creatorName: item.creator.name, createdAt: item.createdAt })),
      feedback: feedback.filter(item => item.status === 'new'),
    });
    return NextResponse.json({ items }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('admin notifications failed', error);
    return NextResponse.json({ error: 'Les notifications sont indisponibles.' }, { status: 500 });
  }
}
