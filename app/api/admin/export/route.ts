import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import { allSubmissions, codesCsv, exportFileName, isExportType, submissionsCsv } from '@/lib/admin-export';
import { loadCatalog } from '@/lib/catalog-db';

export const dynamic = 'force-dynamic';

// GET /api/admin/export?type=codes|propositions : fichier CSV à ouvrir dans un tableur.
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const type = request.nextUrl.searchParams.get('type');
  if (!isExportType(type)) return NextResponse.json({ error: 'Export inconnu.' }, { status: 400 });
  try {
    const db = getDb();
    const csv = type === 'codes' ? codesCsv((await loadCatalog(db, { includeArchived: true })).codes) : submissionsCsv(await allSubmissions(db));
    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${exportFileName(type)}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    console.error('export failed', error);
    return NextResponse.json({ error: 'L’export a échoué.' }, { status: 500 });
  }
}
