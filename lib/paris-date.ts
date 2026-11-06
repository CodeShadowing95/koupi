// Dates de l'admin, toujours à l'heure de Paris. Le serveur (Vercel) tourne en UTC et le navigateur à l'heure locale :
// sans fuseau fixe, le texte rendu par le serveur diffère de celui du navigateur, React signale une erreur
// d'hydratation et reconstruit la page (c'est ce qui faisait perdre le thème, PR #163).
export const PARIS_TIME_ZONE = 'Europe/Paris';

/** Formate un instant (ISO, nombre ou Date) en français, à l'heure de Paris, quel que soit le fuseau de la machine. */
export function parisDate(value: string | number | Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: PARIS_TIME_ZONE }).format(new Date(value));
}

/** Formate un jour de calendrier stocké « AAAA-MM-JJ » (sans heure) : le même jour partout. */
export function calendarDay(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
}
