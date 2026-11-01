// Recherche globale du back-office (⌘K / Ctrl+K) : pages, codes, outils, créateurs et propositions à traiter.
// L'index est construit côté serveur, envoyé une fois à l'ouverture, puis filtré dans le navigateur.
import type { Code } from './data';
import { matchesSearch } from './admin-search';

export type CommandKind = 'page' | 'code' | 'tool' | 'creator' | 'proposal';
export type CommandItem = { kind: CommandKind; label: string; detail: string; href: string; keywords?: string };

export const COMMAND_KIND_LABELS: Record<CommandKind, string> = { page: 'Pages', code: 'Codes', tool: 'Outils', creator: 'Créateurs', proposal: 'Propositions à traiter' };
const ORDER: CommandKind[] = ['page', 'code', 'tool', 'creator', 'proposal'];

export const ADMIN_PAGES: CommandItem[] = [
  { kind: 'page', label: 'Accueil', detail: 'Tableau de bord, à faire', href: '/admin', keywords: 'dashboard kpi' },
  { kind: 'page', label: 'Statistiques', detail: 'Audience, codes, propositions', href: '/admin/stats', keywords: 'stats graphiques audience' },
  { kind: 'page', label: 'Propositions', detail: 'File de modération', href: '/admin/propositions', keywords: 'moderation soumissions' },
  { kind: 'page', label: 'Codes', detail: 'Tous les codes', href: '/admin/codes' },
  { kind: 'page', label: 'Codes à tester', detail: 'Visibles, pas encore essayés', href: '/admin/codes?status=to_test' },
  { kind: 'page', label: 'Codes à retester', detail: 'Test de plus de 30 jours', href: '/admin/codes?status=retest' },
  { kind: 'page', label: 'Outils', detail: 'Catalogue', href: '/admin/outils' },
  { kind: 'page', label: 'Créateurs', detail: 'Catalogue', href: '/admin/createurs' },
  { kind: 'page', label: 'Catégories', detail: 'Catalogue', href: '/admin/categories' },
  { kind: 'page', label: 'Guide de l’admin', detail: 'Apprendre', href: '/admin/guide', keywords: 'aide routine' },
  { kind: 'page', label: 'Exporter les codes (CSV)', detail: 'Fichier pour un tableur', href: '/api/admin/export?type=codes', keywords: 'export csv excel telecharger' },
  { kind: 'page', label: 'Exporter les propositions (CSV)', detail: 'Fichier pour un tableur', href: '/api/admin/export?type=propositions', keywords: 'export csv excel telecharger' },
];

const statusLabel: Record<Code['status'], string> = { verified: 'vérifié', to_test: 'à tester', pending: 'en attente', rejected: 'rejeté' };
const q = (value: string) => encodeURIComponent(value);

export function buildCommandIndex(input: {
  codes: Code[]; tools: { name: string; category: string; archived: boolean }[]; creators: { name: string; codes: number }[];
  proposals: { code: string; toolName: string; creatorName: string }[];
}): CommandItem[] {
  return [
    ...ADMIN_PAGES,
    ...input.codes.map(code => ({ kind: 'code' as const, label: code.code, detail: `${code.tool} · ${code.creator} · ${code.archived ? 'archivé' : statusLabel[code.status]}`, href: `/admin/codes?q=${q(code.code)}`, keywords: code.discount })),
    ...input.tools.map(tool => ({ kind: 'tool' as const, label: tool.name, detail: `${tool.category}${tool.archived ? ' · archivé' : ''}`, href: `/admin/outils?q=${q(tool.name)}` })),
    ...input.creators.map(creator => ({ kind: 'creator' as const, label: creator.name, detail: `${creator.codes} code${creator.codes > 1 ? 's' : ''}`, href: `/admin/createurs?q=${q(creator.name)}` })),
    ...input.proposals.map(item => ({ kind: 'proposal' as const, label: item.code, detail: `${item.toolName} · ${item.creatorName}`, href: `/admin/propositions?q=${q(item.code)}` })),
  ];
}

/** Résultats groupés par type, dans un ordre fixe ; au plus `perKind` par groupe. Sans recherche : les pages seulement. */
export function searchCommands(index: CommandItem[], query: string, perKind = 5): { kind: CommandKind; items: CommandItem[] }[] {
  const items = query.trim() ? index.filter(item => matchesSearch([item.label, item.detail, item.keywords], query)) : index.filter(item => item.kind === 'page');
  return ORDER.map(kind => ({ kind, items: items.filter(item => item.kind === kind).slice(0, query.trim() ? perKind : 20) })).filter(group => group.items.length > 0);
}
