import { describe, expect, it } from 'vitest';
import type { ToolAnalysis } from './tool-analysis';
import { applyToolAnalysis, shortDescription, toolWithSameSite, websiteDomain } from './tool-form-fill';

const analysis = (extra: Partial<ToolAnalysis> = {}): ToolAnalysis => ({
  summary: 'Automatisation de tâches entre applications.', isOnlineTool: true, categorySlug: 'automatisation', newCategory: '', reason: '', universe: 'outils-en-ligne', toolName: 'n8n', model: 'm', url: 'https://n8n.io/', ...extra,
});
const form = { name: 'N8N', categorySlug: '', website: 'n8n.io', description: '', priority: 3 };

describe('applyToolAnalysis', () => {
  it('remplit la catégorie, la description vide et l’écriture du nom', () => {
    expect(applyToolAnalysis(form, analysis())).toEqual({ ...form, name: 'n8n', categorySlug: 'automatisation', description: 'Automatisation de tâches entre applications.' });
  });
  it('ne touche ni une description écrite, ni un autre nom, ni la catégorie quand l’IA en propose une nouvelle', () => {
    const typed = { ...form, name: 'Mon outil', categorySlug: 'vpn', description: 'Ma phrase.' };
    expect(applyToolAnalysis(typed, analysis({ categorySlug: '', newCategory: 'Automatisation IA' }))).toEqual(typed);
  });
});

describe('shortDescription', () => {
  it('coupe à la fin d’une phrase sous 300 caractères', () => {
    const long = `${'Une phrase assez longue pour remplir la fiche. '.repeat(8)}`;
    const short = shortDescription(long);
    expect(short.length).toBeLessThanOrEqual(300);
    expect(short.endsWith('.')).toBe(true);
  });
});

describe('toolWithSameSite', () => {
  const tools = [{ id: '1', name: 'n8n', website: 'https://n8n.io' }, { id: '2', name: 'NordVPN', website: 'https://www.nordvpn.com/fr' }];
  it('trouve l’outil qui a déjà ce site, quelle que soit l’écriture', () => {
    expect(websiteDomain('https://www.N8N.io/pricing')).toBe('n8n.io');
    expect(toolWithSameSite(tools, 'www.n8n.io')?.name).toBe('n8n');
    expect(toolWithSameSite(tools, 'nordvpn.com')?.name).toBe('NordVPN');
  });
  it('ignore l’outil qu’on modifie et une adresse incomplète', () => {
    expect(toolWithSameSite(tools, 'n8n.io', '1')).toBeNull();
    expect(toolWithSameSite(tools, 'n8n')).toBeNull();
  });
});
