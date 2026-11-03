// Affichage du journal de l'espace Administration. Sans base : importable par les composants client.

const LABELS: Record<string, string> = {
  page_off: 'Page coupée :',
  page_on: 'Page remise en ligne :',
  maintenance_on: 'Mode maintenance activé :',
  maintenance_off: 'Mode maintenance arrêté :',
};

export function auditLabel(action: string): string {
  return LABELS[action] ?? `${action} :`;
}

/** « 3 nov. 2026, 14:12 », à l'heure de Paris. */
export function formatAuditDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(iso));
}
