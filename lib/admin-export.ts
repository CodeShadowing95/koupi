// Exports du back-office, en CSV ou en Excel : codes (archives comprises), propositions, outils, créateurs, catégories.
// Les propositions sortent sans e-mail ni empreinte : le fichier peut circuler, il ne doit rien contenir de personnel.
import { desc } from 'drizzle-orm';
import type { Db } from '@/db';
import { submissions, type Submission } from '@/db/schema';
import type { Code } from './data';
import { toCsv } from './csv';
import { toXlsx, type XlsxSheet } from './xlsx';
import type { AdminCategory, AdminCreator, AdminTool } from './catalog-admin';

export const EXPORT_TYPES = ['codes', 'propositions', 'outils', 'createurs', 'categories'] as const;
export type ExportType = typeof EXPORT_TYPES[number];
export function isExportType(value: unknown): value is ExportType { return (EXPORT_TYPES as readonly unknown[]).includes(value); }

export const EXPORT_FORMATS = ['xlsx', 'csv'] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];
export function isExportFormat(value: unknown): value is ExportFormat { return (EXPORT_FORMATS as readonly unknown[]).includes(value); }

/** Un tableau à exporter : nom de la feuille, en-têtes, lignes. */
export type ExportSheet = XlsxSheet;

const codeStatus: Record<Code['status'], string> = { verified: 'Vérifié', to_test: 'À tester', pending: 'En attente', rejected: 'Rejeté' };
const submissionStatus: Record<Submission['status'], string> = { new: 'À traiter', approved: 'Validée', rejected: 'Refusée', duplicate: 'Doublon' };
const day = (iso: string | Date | null) => iso ? new Date(iso).toISOString().slice(0, 10) : '';

export function codesSheet(codes: Code[]): ExportSheet {
  return {
    name: 'Codes',
    headers: ['Outil', 'Créateur', 'Code', 'Réduction', 'Statut', 'Archivé', 'Dernier test', 'Votes', 'Taux de réussite (%)', 'Source', 'Titre de la source', 'Lien du créateur', 'Note interne', 'Ajouté le'],
    rows: codes.map(code => [
      code.tool, code.creator, code.code, code.discount, codeStatus[code.status], code.archived ? 'oui' : 'non', day(code.lastTestedAt),
      code.votes, code.votes ? code.success : '', code.source, code.sourceTitle, code.creatorLink ?? '', code.note ?? '', day(code.createdAt),
    ]),
  };
}

export function submissionsSheet(rows: Submission[]): ExportSheet {
  return {
    name: 'Propositions',
    headers: ['Reçue le', 'Statut', 'Outil', 'Catégorie', 'Créateur', 'Code', 'Réduction', 'Source', 'Lien du créateur', 'Commentaire', 'Note admin', 'Traitée le', 'Code créé'],
    rows: rows.map(row => [
      day(row.createdAt), submissionStatus[row.status], row.toolName, row.category ?? '', row.creatorName, row.code, row.discountLabel,
      row.sourceUrl, row.creatorLink ?? '', row.comment ?? '', row.adminNote ?? '', day(row.reviewedAt), row.createdCodeId ? 'oui' : 'non',
    ]),
  };
}

export function toolsSheet(tools: AdminTool[]): ExportSheet {
  return {
    name: 'Outils',
    headers: ['Outil', 'Catégorie', 'Site officiel', 'Priorité', 'Codes', 'Codes visibles', 'Sur le site', 'Archivé', 'Description'],
    rows: tools.map(tool => [
      tool.name, tool.category, tool.website, tool.priority, tool.codes, tool.visible, tool.visible > 0 && !tool.archived ? 'oui' : 'non', tool.archived ? 'oui' : 'non', tool.description ?? '',
    ]),
  };
}

export function creatorsSheet(creators: AdminCreator[]): ExportSheet {
  return {
    name: 'Créateurs',
    headers: ['Créateur', 'Codes', 'Codes visibles', 'Sur le site', 'Outils recommandés', 'Présentation'],
    rows: creators.map(creator => [creator.name, creator.codes, creator.visible, creator.visible > 0 ? 'oui' : 'non', creator.tools.join(', '), creator.bio ?? '']),
  };
}

export function categoriesSheet(categories: AdminCategory[]): ExportSheet {
  return {
    name: 'Catégories',
    headers: ['Catégorie', 'Famille', 'Outils', 'Outils avec un code visible', 'Couverture (%)'],
    rows: categories.map(category => [category.name, category.family ?? '', category.tools, category.covered, category.tools ? Math.round((category.covered / category.tools) * 100) : 0]),
  };
}

export const codesCsv = (codes: Code[]) => sheetToCsv(codesSheet(codes));
export const submissionsCsv = (rows: Submission[]) => sheetToCsv(submissionsSheet(rows));

export function sheetToCsv(sheet: ExportSheet): string {
  return toCsv(sheet.headers, sheet.rows);
}

/** Contenu du fichier et son type MIME, selon le format choisi. */
export function renderExport(sheet: ExportSheet, format: ExportFormat): { body: string | Uint8Array; contentType: string } {
  return format === 'xlsx'
    ? { body: toXlsx(sheet), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    : { body: sheetToCsv(sheet), contentType: 'text/csv; charset=utf-8' };
}

/** Toutes les propositions, les plus récentes d'abord (5 000 au plus, bien au-delà du volume attendu). */
export function allSubmissions(db: Db): Promise<Submission[]> {
  return db.select().from(submissions).orderBy(desc(submissions.createdAt)).limit(5000);
}

export function exportFileName(type: ExportType, format: ExportFormat = 'csv', now = new Date()): string {
  return `koupi-${type}-${day(now)}.${format}`;
}
