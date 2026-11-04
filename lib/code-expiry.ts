// Date de fin d'un code (« Valable jusqu'au »), facultative : la plupart des codes de créateurs n'en ont pas.
// Les dates sont des jours (AAAA-MM-JJ), comparés à la date du jour à Paris.

/** Une date de fin approche : on prévient le visiteur à partir de ce nombre de jours. */
export const EXPIRY_WARNING_DAYS = 7;

/** Date du jour à Paris, au format AAAA-MM-JJ. */
export function todayInParis(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Vrai pour une vraie date AAAA-MM-JJ (pas de 31 février). */
export function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export type Expiry =
  | { state: 'none' }
  | { state: 'later' | 'soon' | 'today'; daysLeft: number; label: string }
  | { state: 'expired'; label: string };

const dayLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

/** Où en est la date de fin d'un code, avec la phrase à afficher sur le site. */
export function expiryOf(expiresOn: string | null | undefined, now = new Date()): Expiry {
  if (!expiresOn || !isValidDay(expiresOn)) return { state: 'none' };
  const daysLeft = daysBetween(todayInParis(now), expiresOn);
  if (daysLeft < 0) return { state: 'expired', label: `Date de fin passée (${dayLabel(expiresOn)})` };
  if (daysLeft === 0) return { state: 'today', daysLeft, label: 'Expire aujourd’hui' };
  if (daysLeft <= EXPIRY_WARNING_DAYS) return { state: 'soon', daysLeft, label: `Expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}` };
  return { state: 'later', daysLeft, label: `Valable jusqu’au ${dayLabel(expiresOn)}` };
}
