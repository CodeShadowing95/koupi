// Export CSV du back-office : codes (archives comprises) et propositions.
// Les propositions sortent sans e-mail ni empreinte : le fichier peut circuler, il ne doit rien contenir de personnel.
import { desc } from 'drizzle-orm';
import type { Db } from '@/db';
import { submissions, type Submission } from '@/db/schema';
import type { Code } from './data';
import { toCsv } from './csv';

export const EXPORT_TYPES = ['codes', 'propositions'] as const;
export type ExportType = typeof EXPORT_TYPES[number];
export function isExportType(value: unknown): value is ExportType { return (EXPORT_TYPES as readonly unknown[]).includes(value); }

const codeStatus: Record<Code['status'], string> = { verified: 'Vérifié', to_test: 'À tester', pending: 'En attente', rejected: 'Rejeté' };
const submissionStatus: Record<Submission['status'], string> = { new: 'À traiter', approved: 'Validée', rejected: 'Refusée', duplicate: 'Doublon' };
const day = (iso: string | Date | null) => iso ? new Date(iso).toISOString().slice(0, 10) : '';

export function codesCsv(codes: Code[]): string {
  return toCsv(
    ['Outil', 'Créateur', 'Code', 'Réduction', 'Statut', 'Archivé', 'Dernier test', 'Votes', 'Taux de réussite (%)', 'Source', 'Titre de la source', 'Lien du créateur', 'Note interne', 'Ajouté le'],
    codes.map(code => [
      code.tool, code.creator, code.code, code.discount, codeStatus[code.status], code.archived ? 'oui' : 'non', day(code.lastTestedAt),
      code.votes, code.votes ? code.success : '', code.source, code.sourceTitle, code.creatorLink ?? '', code.note ?? '', day(code.createdAt),
    ]),
  );
}

export function submissionsCsv(rows: Submission[]): string {
  return toCsv(
    ['Reçue le', 'Statut', 'Outil', 'Catégorie', 'Créateur', 'Code', 'Réduction', 'Source', 'Lien du créateur', 'Commentaire', 'Note admin', 'Traitée le', 'Code créé'],
    rows.map(row => [
      day(row.createdAt), submissionStatus[row.status], row.toolName, row.category ?? '', row.creatorName, row.code, row.discountLabel,
      row.sourceUrl, row.creatorLink ?? '', row.comment ?? '', row.adminNote ?? '', day(row.reviewedAt), row.createdCodeId ? 'oui' : 'non',
    ]),
  );
}

/** Toutes les propositions, les plus récentes d'abord (5 000 au plus, bien au-delà du volume attendu). */
export function allSubmissions(db: Db): Promise<Submission[]> {
  return db.select().from(submissions).orderBy(desc(submissions.createdAt)).limit(5000);
}

export function exportFileName(type: ExportType, now = new Date()): string {
  return `koupi-${type}-${day(now)}.csv`;
}
