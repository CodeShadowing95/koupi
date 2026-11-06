import { describe, expect, it } from 'vitest';
import { CODE_FORMAT_ERROR, codeFormatError, findDuplicateCode, normalizeCode, sameCode } from './code-format';

describe('normalizeCode', () => {
  it('met en majuscules et retire les espaces autour', () => {
    expect(normalizeCode('  digitiz ')).toBe('DIGITIZ');
    expect(normalizeCode('ak-dev10')).toBe('AK-DEV10');
  });
});

describe('codeFormatError', () => {
  it('accepte lettres, chiffres et tirets', () => {
    for (const code of ['DIGITIZ', 'AKDEV10', 'MERCI-20', 'A', '2026']) expect(codeFormatError(code)).toBeNull();
  });

  it('refuse un code vide', () => {
    expect(codeFormatError('')).toBe('Indique le code.');
  });

  it('refuse espaces, balises et autres signes', () => {
    for (const code of ['MERCI 20', '<SCRIPT>ALERT(1)</SCRIPT>', 'CODE_20', 'CODE.20', 'CODÉ', '3M3K9/5R92S']) expect(codeFormatError(code)).toBe(CODE_FORMAT_ERROR);
  });

  it('refuse un tiret au début ou à la fin', () => {
    expect(codeFormatError('-MERCI')).toBe(CODE_FORMAT_ERROR);
    expect(codeFormatError('MERCI-')).toBe(CODE_FORMAT_ERROR);
  });

  it('refuse plus de 40 caractères', () => {
    expect(codeFormatError('A'.repeat(40))).toBeNull();
    expect(codeFormatError('A'.repeat(41))).toBe(CODE_FORMAT_ERROR);
  });
});

describe('findDuplicateCode', () => {
  const codes = [
    { id: '1', toolSlug: 'abby', code: 'DIGITIZ' },
    { id: '2', toolSlug: 'notion', code: 'DIGITIZ' },
    { id: '3', toolSlug: 'abby', code: 'OLD', archived: true },
  ];

  it('trouve le même code pour le même outil, casse ignorée', () => {
    expect(findDuplicateCode(codes, 'abby', ' digitiz')?.id).toBe('1');
    expect(sameCode('digitiz', 'DIGITIZ')).toBe(true);
  });

  it('compte aussi les codes archivés', () => {
    expect(findDuplicateCode(codes, 'abby', 'old')?.id).toBe('3');
  });

  it('ignore les autres outils et le code en cours de modification', () => {
    expect(findDuplicateCode(codes, 'canva', 'DIGITIZ')).toBeUndefined();
    expect(findDuplicateCode(codes, 'abby', 'DIGITIZ', '1')).toBeUndefined();
  });

  it('ne cherche rien sans outil ni code', () => {
    expect(findDuplicateCode(codes, '', 'DIGITIZ')).toBeUndefined();
    expect(findDuplicateCode(codes, 'abby', '  ')).toBeUndefined();
  });
});
