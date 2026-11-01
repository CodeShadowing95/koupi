import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';

describe('csvCell', () => {
  it('leaves simple values as they are', () => {
    expect(csvCell('NOTION20')).toBe('NOTION20');
    expect(csvCell(42)).toBe('42');
    expect(csvCell(null)).toBe('');
  });
  it('quotes separators, quotes and line breaks', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('dit "oui"')).toBe('"dit ""oui"""');
    expect(csvCell('ligne\nsuite')).toBe('"ligne\nsuite"');
  });
  it('neutralises spreadsheet formulas in text', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+SUM(A1)')).toBe("'+SUM(A1)");
    expect(csvCell('-2+3+cmd|calc!A0')).toBe("'-2+3+cmd|calc!A0");
    expect(csvCell('@moi')).toBe("'@moi");
    expect(csvCell(-3)).toBe('-3');
  });
  it('keeps plain discounts readable', () => {
    expect(csvCell('-20 %')).toBe('-20 %');
    expect(csvCell('+1 mois offert')).toBe('+1 mois offert');
  });
  it('writes dates as ISO text', () => {
    expect(csvCell(new Date('2026-11-01T10:00:00Z'))).toBe('2026-11-01T10:00:00.000Z');
  });
});

describe('toCsv', () => {
  it('starts with a BOM and ends each line with CRLF', () => {
    expect(toCsv(['Code', 'Outil'], [['A', 'B']])).toBe('﻿Code;Outil\r\nA;B\r\n');
  });
});
