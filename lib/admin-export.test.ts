import { describe, expect, it } from 'vitest';
import type { Submission } from '@/db/schema';
import type { Code } from './data';
import { codesCsv, exportFileName, isExportType, submissionsCsv } from './admin-export';

const code: Code = {
  id: '1', tool: 'Notion', toolSlug: 'notion', creator: 'Ali', creatorSlug: 'ali', code: 'ALI20', discount: '-20 %', status: 'verified',
  source: 'https://youtu.be/x', sourceTitle: 'Ma vidéo; épisode 2', votes: 4, success: 75, lastTestedAt: '2026-10-20T08:00:00.000Z',
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
    expect(exportFileName('codes', new Date('2026-11-01T10:00:00Z'))).toBe('koupi-codes-2026-11-01.csv');
  });
});
