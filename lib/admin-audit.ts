// Affichage du journal de l'espace Administration. Sans base : importable par les composants client.

const LABELS: Record<string, string> = {
  page_off: 'Page coupée :',
  page_on: 'Page remise en ligne :',
  maintenance_on: 'Mode maintenance activé :',
  offer_links_on: 'Option activée :',
  offer_links_off: 'Option coupée :',
  maintenance_off: 'Mode maintenance arrêté :',
  creator_disabled: 'Compte créateur désactivé :',
  creator_enabled: 'Compte créateur réactivé :',
  creator_access_removed: 'Accès à la page retiré :',
  creator_deleted: 'Compte créateur supprimé :',
  creator_link_invite: 'Invitation à relier sa page envoyée :',
  creator_delete: 'Créateur supprimé à sa demande :',
  creator_unremove: 'Sorti de la liste des créateurs retirés :',
  creator_remove: 'Ajouté à la liste des créateurs retirés :',
  universe_on: 'Univers allumé sur le site :',
  universe_off: 'Univers éteint sur le site :',
  universe_sorted: 'Rangées dans leur univers :',
};

export function auditLabel(action: string): string {
  return LABELS[action] ?? `${action} :`;
}

/** « 3 nov. 2026, 14:12 », à l'heure de Paris. */
export function formatAuditDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(iso));
}
