import { NextRequest, NextResponse } from 'next/server';
import { getDb, type Db } from '@/db';
import { isAdminRequest } from '@/lib/admin-guard';
import {
  allSubmissions, categoriesSheet, codesSheet, creatorsSheet, exportFileName, isExportFormat, isExportType, renderExport, submissionsSheet, toolsSheet,
  type ExportSheet, type ExportType,
} from '@/lib/admin-export';
import { listCategoriesAdmin, listCreatorsAdmin, listToolsAdmin } from '@/lib/catalog-admin';
import { loadCatalog } from '@/lib/catalog-db';

export const dynamic = 'force-dynamic';

async function sheetFor(db: Db, type: ExportType): Promise<ExportSheet> {
  switch (type) {
    case 'codes': return codesSheet((await loadCatalog(db, { includeArchived: true })).codes);
    case 'propositions': return submissionsSheet(await allSubmissions(db));
    case 'outils': return toolsSheet(await listToolsAdmin(db));
    case 'createurs': return creatorsSheet(await listCreatorsAdmin(db));
    case 'categories': return categoriesSheet(await listCategoriesAdmin(db));
  }
}

// GET /api/admin/export?type=codes|propositions|outils|createurs|categories&format=xlsx|csv
// Fichier à ouvrir dans Excel, Numbers ou Google Sheets. Sans format : CSV (comportement d'origine).
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const type = request.nextUrl.searchParams.get('type');
  const format = request.nextUrl.searchParams.get('format') ?? 'csv';
  if (!isExportType(type)) return NextResponse.json({ error: 'Export inconnu.' }, { status: 400 });
  if (!isExportFormat(format)) return NextResponse.json({ error: 'Format inconnu.' }, { status: 400 });
  try {
    const { body, contentType } = renderExport(await sheetFor(getDb(), type), format);
    return new NextResponse(body as BodyInit, {
      headers: {
        'content-type': contentType,
        'content-disposition': `attachment; filename="${exportFileName(type, format)}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    console.error('export failed', error);
    return NextResponse.json({ error: 'L’export a échoué.' }, { status: 500 });
  }
}
