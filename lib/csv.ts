// Fichiers CSV pour Excel, Numbers ou Google Sheets : séparateur point-virgule (Excel en français),
// BOM UTF-8 pour les accents, et protection contre l'injection de formules : une cellule qui commence
// par = ou @, ou par + ou - suivi d'un appel de fonction, d'un lien DDE (|) ou d'une référence (!), serait
// exécutée par le tableur. On la préfixe d'une apostrophe. « -20 % » reste tel quel.
export type CsvValue = string | number | boolean | Date | null | undefined;

const FORMULA_START = /^[=@\t\r]/;
const SIGNED_FORMULA = /^[+-][^]*[=(|!@]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === 'string' && (FORMULA_START.test(text) || SIGNED_FORMULA.test(text))) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  return '﻿' + [headers, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
