// Recherche globale du back-office (⌘K / Ctrl+K) : pages, codes, outils, créateurs et propositions à traiter.
// L'index est construit côté serveur, envoyé une fois à l'ouverture, puis filtré dans le navigateur.
import type { Code } from './data';
import { matchesSearch } from './admin-search';

export type CommandKind = 'page' | 'code' | 'tool' | 'creator' | 'proposal';
/** status : pastille affichée à droite (statut d'un code, outil archivé). */
export type CommandStatus = Code['status'] | 'archived';
export type CommandItem = { kind: CommandKind; label: string; detail: string; href: string; keywords?: string; status?: CommandStatus };
export type CommandFilter = CommandKind | 'all';
/** Un groupe de résultats. kind est absent pour les groupes de suggestions (récents, accès rapide…), qui mêlent les types. */
export type CommandGroup = { id: string; title: string; kind?: CommandKind; items: CommandItem[]; total: number };

export const COMMAND_KIND_LABELS: Record<CommandKind, string> = { page: 'Pages', code: 'Codes', tool: 'Outils', creator: 'Créateurs', proposal: 'Propositions à traiter' };
/** Libellés courts des filtres de la palette. */
export const COMMAND_FILTER_LABELS: Record<CommandFilter, string> = { all: 'Tout', page: 'Pages', code: 'Codes', tool: 'Outils', creator: 'Créateurs', proposal: 'Propositions' };
export const COMMAND_STATUS_LABELS: Record<CommandStatus, string> = { verified: 'Vérifié', to_test: 'À tester', pending: 'En attente', rejected: 'Rejeté', archived: 'Archivé' };
export const COMMAND_ORDER: CommandKind[] = ['page', 'code', 'tool', 'creator', 'proposal'];
export const COMMAND_FILTERS: CommandFilter[] = ['all', ...COMMAND_ORDER];

export const ADMIN_PAGES: CommandItem[] = [
  { kind: 'page', label: 'Accueil', detail: 'Tableau de bord, à faire', href: '/admin', keywords: 'dashboard kpi' },
  { kind: 'page', label: 'Statistiques', detail: 'Audience, codes, propositions', href: '/admin/stats', keywords: 'stats graphiques audience' },
  { kind: 'page', label: 'Rendement des sources', detail: 'Statistiques : trouvés, publiés, copiés ; copies par outil', href: '/admin/stats?tab=sources', keywords: 'rendement sources copies outils categories demande' },
  { kind: 'page', label: 'Consommation', detail: 'Statistiques : quota YouTube, dépense IA', href: '/admin/stats?tab=consommation', keywords: 'quota api youtube ia credits tokens budget plafond' },
  { kind: 'page', label: 'Propositions', detail: 'File de modération', href: '/admin/propositions', keywords: 'moderation soumissions' },
  { kind: 'page', label: 'Codes', detail: 'Tous les codes', href: '/admin/codes' },
  { kind: 'page', label: 'Codes à tester', detail: 'Visibles, pas encore essayés', href: '/admin/codes?status=to_test' },
  { kind: 'page', label: 'Codes à retester', detail: 'Test de plus de 30 jours', href: '/admin/codes?status=retest' },
  { kind: 'page', label: 'Vérifications', detail: 'Analyse des sources, score et IA', href: '/admin/verifications', keywords: 'verifier ia score analyse source' },
  { kind: 'page', label: 'Sources', detail: 'D’où viennent les codes : recherches, chaînes et podcasts suivis, rendement', href: '/admin/sources', keywords: 'sources source rendement journal youtube chaines podcasts quota' },
  { kind: 'page', label: 'Podcasts suivis', detail: 'Podcasts lus pour trouver des codes', href: '/admin/podcasts', keywords: 'podcast episode audio podcast index' },
  { kind: 'page', label: 'Podcasts candidats', detail: 'Podcasts trouvés chaque lundi dans Podcast Index, à suivre ou écarter', href: '/admin/podcasts?tab=candidats', keywords: 'podcast index candidats decouvrir annuaire' },
  { kind: 'page', label: 'Demandes créateurs', detail: 'C’est ma page, page incorrecte', href: '/admin/createurs/demandes', keywords: 'revendication revendiquer signalement reclamation createur' },
  { kind: 'page', label: 'Retours', detail: 'Avis des visiteurs', href: '/admin/retours', keywords: 'avis feedback remarques idees problemes suggestions' },
  { kind: 'page', label: 'Outils', detail: 'Catalogue', href: '/admin/outils' },
  { kind: 'page', label: 'Outils à ajouter', detail: 'Codes trouvés pour des outils absents du catalogue', href: '/admin/outils/a-ajouter', keywords: 'suggestions outils manquants nouveaux ajouter' },
  { kind: 'page', label: 'Créateurs', detail: 'Catalogue', href: '/admin/createurs' },
  { kind: 'page', label: 'Catégories', detail: 'Catalogue', href: '/admin/categories' },
  { kind: 'page', label: 'Guide de l’admin', detail: 'Apprendre', href: '/admin/guide', keywords: 'aide routine' },
  { kind: 'page', label: 'Administration', detail: 'Administration', href: '/admin/administration', keywords: 'pages maintenance pause journal couper désactiver' },
  ...([['codes', 'les codes'], ['propositions', 'les propositions'], ['outils', 'les outils'], ['createurs', 'les créateurs'], ['categories', 'les catégories']] as const).map(([type, name]): CommandItem => (
    { kind: 'page', label: `Exporter ${name} (Excel)`, detail: 'Fichier .xlsx pour un tableur', href: `/api/admin/export?type=${type}&format=xlsx`, keywords: 'export excel xlsx csv tableur telecharger' }
  )),
];

const statusLabel: Record<Code['status'], string> = { verified: 'vérifié', to_test: 'à tester', pending: 'en attente', rejected: 'rejeté' };
const q = (value: string) => encodeURIComponent(value);

export function buildCommandIndex(input: {
  codes: Code[]; tools: { name: string; category: string; archived: boolean }[]; creators: { name: string; codes: number }[];
  proposals: { code: string; toolName: string; creatorName: string }[];
}): CommandItem[] {
  return [
    ...ADMIN_PAGES,
    ...input.codes.map((code): CommandItem => ({
      kind: 'code', label: code.code || 'Offre par lien', detail: `${code.tool} · ${code.creator}`, href: `/admin/codes?q=${q(code.code || code.tool)}`,
      keywords: `${code.discount} ${code.archived ? 'archivé' : statusLabel[code.status]}`, status: code.archived ? 'archived' : code.status,
    })),
    ...input.tools.map((tool): CommandItem => ({ kind: 'tool', label: tool.name, detail: tool.category, href: `/admin/outils?q=${q(tool.name)}`, keywords: tool.archived ? 'archivé' : undefined, status: tool.archived ? 'archived' : undefined })),
    ...input.creators.map(creator => ({ kind: 'creator' as const, label: creator.name, detail: `${creator.codes} code${creator.codes > 1 ? 's' : ''}`, href: `/admin/createurs?q=${q(creator.name)}` })),
    ...input.proposals.map(item => ({ kind: 'proposal' as const, label: item.code, detail: `${item.toolName} · ${item.creatorName}`, href: `/admin/propositions?q=${q(item.code)}` })),
  ];
}

/** Pages proposées à l'ouverture, avant de taper : le travail du jour d'abord. */
export const QUICK_HREFS = ['/admin/propositions', '/admin/codes?status=to_test', '/admin/codes?status=retest', '/admin/stats'];
export const RECENT_STORAGE_KEY = 'koupi-admin-recent';
const RECENT_MAX = 5;

/** Ajoute un lien ouvert en tête des récents, sans doublon. */
export function pushRecent(recent: string[], href: string, max = RECENT_MAX): string[] {
  return [href, ...recent.filter(item => item !== href)].slice(0, max);
}

/** Lit la liste des récents stockée (tolère une valeur absente ou abîmée). */
export function parseRecent(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, RECENT_MAX) : [];
  } catch { return []; }
}

/**
 * Ce que montre la palette avant qu'on tape.
 * « Tout » : récents, accès rapide, puis les autres pages et les exports. Un type choisi : ses premiers éléments, pour parcourir.
 */
export function suggestCommands(index: CommandItem[], recent: string[], filter: CommandFilter = 'all'): CommandGroup[] {
  if (filter !== 'all') {
    const all = index.filter(item => item.kind === filter);
    return all.length ? [{ id: filter, title: COMMAND_KIND_LABELS[filter], kind: filter, items: all.slice(0, 50), total: all.length }] : [];
  }
  const byHref = new Map(index.map(item => [item.href, item]));
  const pick = (hrefs: string[]) => hrefs.map(href => byHref.get(href)).filter((item): item is CommandItem => Boolean(item));
  const recentItems = pick(recent);
  const quick = pick(QUICK_HREFS).filter(item => !recent.includes(item.href));
  const used = new Set([...recentItems, ...quick].map(item => item.href));
  const pages = index.filter(item => item.kind === 'page' && !used.has(item.href) && !item.href.startsWith('/api/'));
  const actions = index.filter(item => item.kind === 'page' && !used.has(item.href) && item.href.startsWith('/api/'));
  return [
    { id: 'recent', title: 'Récents', items: recentItems, total: recentItems.length },
    { id: 'quick', title: 'Accès rapide', items: quick, total: quick.length },
    { id: 'pages', title: 'Pages', items: pages, total: pages.length },
    { id: 'actions', title: 'Exports', items: actions, total: actions.length },
  ].filter(group => group.total > 0);
}

/**
 * Résultats groupés par type, dans un ordre fixe. Sans recherche : rien (voir suggestCommands).
 * Avec le filtre « Tout », au plus `perKind` par groupe ; avec un type choisi, jusqu'à 50. `total` compte toutes les correspondances.
 */
export function searchCommands(index: CommandItem[], query: string, perKind = 5, filter: CommandFilter = 'all'): CommandGroup[] {
  if (!query.trim()) return [];
  const items = index.filter(item => matchesSearch([item.label, item.detail, item.keywords], query));
  return COMMAND_ORDER
    .filter(kind => filter === 'all' || filter === kind)
    .map(kind => {
      const all = items.filter(item => item.kind === kind);
      return { id: kind, title: COMMAND_KIND_LABELS[kind], kind, items: all.slice(0, filter === 'all' ? perKind : 50), total: all.length };
    })
    .filter(group => group.total > 0);
}

/** Nombre de correspondances par type, pour les compteurs des filtres. Sans recherche : la taille de chaque type. */
export function countByKind(index: CommandItem[], query: string): Record<CommandFilter, number> {
  const counts: Record<CommandFilter, number> = { all: 0, page: 0, code: 0, tool: 0, creator: 0, proposal: 0 };
  const typed = query.trim().length > 0;
  for (const item of index) if (!typed || matchesSearch([item.label, item.detail, item.keywords], query)) { counts[item.kind] += 1; counts.all += 1; }
  return counts;
}

/** Filtre suivant (ou précédent) quand on appuie sur Tab (ou Maj+Tab). */
export function cycleFilter(current: CommandFilter, step: 1 | -1): CommandFilter {
  const at = COMMAND_FILTERS.indexOf(current);
  return COMMAND_FILTERS[(at + step + COMMAND_FILTERS.length) % COMMAND_FILTERS.length];
}

/** Retire accents et casse caractère par caractère, pour garder les positions du texte d'origine. */
function fold(text: string): string {
  return Array.from(text, char => char.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0) || char).join('');
}

/**
 * Découpe un libellé pour surligner les mots tapés (sans tenir compte des accents ni de la casse).
 * Renvoie des morceaux { text, match } à afficher dans l'ordre.
 */
export function highlightParts(label: string, query: string): { text: string; match: boolean }[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [{ text: label, match: false }];
  const folded = fold(label);
  const marked = new Array<boolean>(label.length).fill(false);
  for (const word of words) {
    for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + word.length)) marked.fill(true, at, at + word.length);
  }
  const parts: { text: string; match: boolean }[] = [];
  for (let i = 0; i < label.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.match === marked[i]) last.text += label[i];
    else parts.push({ text: label[i], match: marked[i] });
  }
  return parts;
}
