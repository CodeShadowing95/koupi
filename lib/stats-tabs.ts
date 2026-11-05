// Onglets de la page Statistiques (?tab=…). Une valeur inconnue ou absente ouvre le premier onglet.
export const STATS_TABS = [
  { value: 'catalogue', label: 'Catalogue et audience' },
  { value: 'sources', label: 'Sources et outils' },
  { value: 'consommation', label: 'Consommation' },
] as const;
export type StatsTab = (typeof STATS_TABS)[number]['value'];

export function parseStatsTab(value: string | string[] | undefined): StatsTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return STATS_TABS.find(item => item.value === tab)?.value ?? 'catalogue';
}

/** L'adresse d'un onglet : le premier garde l'adresse nue /admin/stats. */
export const statsTabHref = (tab: StatsTab) => (tab === 'catalogue' ? '/admin/stats' : `/admin/stats?tab=${tab}`);
