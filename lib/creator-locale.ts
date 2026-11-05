// Pays et langue d'un créateur, déduits de ses comptes (ADR-0031) : un pays ou une langue corrigé à la main passe
// avant, puis la chaîne YouTube, puis les autres comptes. Sans base ni réseau : importable par les composants client.
import { cleanMetrics, type AccountMetrics } from './account-metrics';
import { countryFlag, countryName, languageName } from './language-guess';

type Account = { platform: string; metrics: AccountMetrics | unknown };
export type CreatorLocale = { country: string | null; language: string | null };

const rank = (account: Account) => (cleanMetrics(account.metrics).localeManual ? 0 : account.platform === 'youtube' ? 1 : 2);

export function creatorLocale(accounts: Account[]): CreatorLocale {
  const ordered = [...accounts].sort((a, b) => rank(a) - rank(b)).map(account => cleanMetrics(account.metrics));
  return {
    country: ordered.find(metrics => metrics.country)?.country ?? null,
    language: ordered.find(metrics => metrics.language)?.language ?? null,
  };
}

/** « 🇫🇷 France · Français », « Français », ou null. */
export function localeLabel(locale: CreatorLocale): string | null {
  const parts = [locale.country ? `${countryFlag(locale.country)} ${countryName(locale.country)}` : null, locale.language ? languageName(locale.language) : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** Court, pour une carte ou une ligne de tableau : « 🇫🇷 FR », « FR » (langue) ou null. */
export function localeShort(locale: CreatorLocale): string | null {
  if (locale.country) return `${countryFlag(locale.country)} ${locale.language ? locale.language.toUpperCase() : locale.country}`;
  return locale.language ? locale.language.toUpperCase() : null;
}
