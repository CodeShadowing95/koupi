import { describe, expect, it } from 'vitest';
import type { Submission } from '@/db/schema';
import type { Code } from './data';
import { categoriesSheet, codesCsv, creatorsSheet, exportFileName, isExportFormat, isExportType, renderExport, submissionsCsv, toolsSheet } from './admin-export';

const code: Code = {
  id: '1', tool: 'Notion', toolSlug: 'notion', creator: 'Ali', creatorSlug: 'ali', code: 'ALI20', discount: '-20 %', status: 'verified',
  source: 'https://youtu.be/x', sourceTitle: 'Ma vidéo; épisode 2', votes: 4, success: 75, lastTestedAt: '2026-10-20T08:00:00.000Z', paymentTestedAt: null, expiresOn: null,
  createdAt: '2026-09-01T08:00:00.000Z', archived: true,
};

describe('codesCsv', () => {
  it('writes one line per code with French labels', () => {
    const lines = codesCsv([code]).replace('﻿', '').trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0].startsWith('Outil;Créateur;Code;Réduction;Statut')).toBe(true);
    expect(lines[1]).toBe("Notion;Ali;ALI20;-20 %;Vérifié;oui;2026-10-20;4;75;https://youtu.be/x;\"Ma vidéo; épisode 2\";;;2026-09-01");
  });
  it('leaves the success rate empty without votes', () => {
    expect(codesCsv([{ ...code, votes: 0, success: 0 }]).split('\r\n')[1]).toContain(';0;;https://');
  });
});

describe('submissionsCsv', () => {
  it('never exports the e-mail or the fingerprint', () => {
    const row = {
      id: 's', toolName: 'Canva', creatorName: 'Bea', category: null, code: 'BEA', discountLabel: '1 mois', sourceUrl: 'https://x.y', creatorLink: null,
      comment: null, submitterEmail: 'bea@example.com', ipHash: 'hash', fingerprint: 'fp', status: 'new', adminNote: null, createdCodeId: null,
      createdAt: new Date('2026-10-30T12:00:00Z'), reviewedAt: null,
    } as Submission;
    const csv = submissionsCsv([row]);
    expect(csv).not.toContain('bea@example.com');
    expect(csv).not.toContain('hash');
    expect(csv.split('\r\n')[1]).toBe('2026-10-30;À traiter;Canva;;Bea;BEA;1 mois;https://x.y;;;;;non');
  });
});

describe('export helpers', () => {
  it('accepts only known types and names the file by day', () => {
    expect(isExportType('codes')).toBe(true);
    expect(isExportType('users')).toBe(false);
    expect(isExportType('outils')).toBe(true);
    expect(isExportFormat('xlsx')).toBe(true);
    expect(isExportFormat('pdf')).toBe(false);
    expect(exportFileName('codes', 'csv', new Date('2026-11-01T10:00:00Z'))).toBe('koupi-codes-2026-11-01.csv');
    expect(exportFileName('outils', 'xlsx', new Date('2026-11-01T10:00:00Z'))).toBe('koupi-outils-2026-11-01.xlsx');
  });

  it('renders CSV as text and Excel as a zip archive', () => {
    const sheet = categoriesSheet([{ slug: 'vpn', name: 'VPN', familySlug: 'securite', family: 'Sécurité et vie privée', tools: 4, covered: 3 }]);
    const csv = renderExport(sheet, 'csv');
    expect(csv.contentType).toContain('text/csv');
    expect(String(csv.body)).toContain('VPN;Sécurité et vie privée;4;3;75');
    const xlsx = renderExport(sheet, 'xlsx');
    expect(xlsx.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(Array.from((xlsx.body as Uint8Array).slice(0, 4))).toEqual([0x50, 0x4B, 0x03, 0x04]);
  });
});

describe('catalogue sheets', () => {
  it('exports tools with their status on the site', () => {
    const sheet = toolsSheet([
      { id: '1', slug: 'nord', name: 'NordVPN', categorySlug: 'vpn', category: 'VPN', website: 'nordvpn.com', description: null, priority: 1, codes: 3, visible: 2, archived: false },
      { id: '2', slug: 'old', name: 'Old', categorySlug: 'vpn', category: 'VPN', website: 'old.com', description: 'x', priority: 3, codes: 1, visible: 1, archived: true },
    ]);
    expect(sheet.rows).toEqual([
      ['NordVPN', 'VPN', 'nordvpn.com', 1, 3, 2, 'oui', 'non', ''],
      ['Old', 'VPN', 'old.com', 3, 1, 1, 'non', 'oui', 'x'],
    ]);
  });

  it('exports creators with the tools they recommend', () => {
    expect(creatorsSheet([{ id: '1', slug: 'ali', name: 'Ali', bio: null, codes: 2, visible: 0, tools: ['Notion', 'Qonto'] }]).rows).toEqual([['Ali', 2, 0, 'non', 'Notion, Qonto', '']]);
  });

  it('gives a 0 % coverage to an empty category', () => {
    expect(categoriesSheet([{ slug: 'x', name: 'X', familySlug: null, family: null, tools: 0, covered: 0 }]).rows[0][4]).toBe(0);
  });
});
