// Filtres, tris et vue « À contacter » de la page Créateurs de l'admin. Sans base ni réseau : importable par les
// composants client. L'audience d'un créateur est celle de son compte le plus suivi ; un podcast compte par ses notes.
import { cleanMetrics } from './account-metrics';
import type { ClaimStatus, CreatorPlatform } from './creator-accounts-display';
import { creatorLocale } from './creator-locale';
import type { CreatorLevel } from './verification';

type Account = { platform: CreatorPlatform; subscribers: number | null; metrics: unknown; claimStatus: ClaimStatus };
export type AdminCreatorFacts = {
  name: string; visible: number; level: CreatorLevel; accounts: Account[];
  /** Copies de ses codes depuis le début du mois. */
  copies: number;
  /** Le créateur a déjà accès à son espace, ou une revendication attend une réponse : il nous connaît déjà. */
  inTouch: boolean;
};

export type PlatformFilter = 'all' | 'youtube' | 'podcast' | 'other' | 'none';
export type LanguageFilter = 'all' | 'fr' | 'en' | 'other' | 'unknown';
export type AudienceFilter = 'all' | 'none' | 'small' | 'mid' | 'large' | 'huge';
export type CreatorFilters = { platform: PlatformFilter; language: LanguageFilter; audience: AudienceFilter };
export const NO_FILTERS: CreatorFilters = { platform: 'all', language: 'all', audience: 'all' };

export const PLATFORM_FILTERS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'Tous les réseaux' }, { value: 'youtube', label: 'YouTube' }, { value: 'podcast', label: 'Podcast' },
  { value: 'other', label: 'Autre réseau' }, { value: 'none', label: 'Aucun compte' },
];
export const LANGUAGE_FILTERS: { value: LanguageFilter; label: string }[] = [
  { value: 'all', label: 'Toutes les langues' }, { value: 'fr', label: 'Français' }, { value: 'en', label: 'Anglais' },
  { value: 'other', label: 'Autre langue' }, { value: 'unknown', label: 'Langue inconnue' },
];
export const AUDIENCE_FILTERS: { value: AudienceFilter; label: string }[] = [
  { value: 'all', label: 'Toute audience' }, { value: 'none', label: 'Audience inconnue' }, { value: 'small', label: 'Moins de 10 k' },
  { value: 'mid', label: '10 k à 100 k' }, { value: 'large', label: '100 k à 1 M' }, { value: 'huge', label: 'Plus de 1 M' },
];

/** Abonnés du compte le plus suivi, null si aucun compte ne donne ce chiffre. */
export function creatorSubscribers(accounts: Account[]): number | null {
  const counts = accounts.map(account => account.subscribers).filter((n): n is number => typeof n === 'number');
  return counts.length ? Math.max(...counts) : null;
}

/** Nombre de notes du podcast le plus noté, null sans note. */
export function creatorRatings(accounts: Account[]): number | null {
  const counts = accounts.map(account => cleanMetrics(account.metrics).ratingCount).filter((n): n is number => typeof n === 'number');
  return counts.length ? Math.max(...counts) : null;
}

/** Tranche d'audience, d'après les abonnés (un podcast sans abonnés connus n'a pas de tranche). */
export function audienceBracket(subscribers: number | null): Exclude<AudienceFilter, 'all'> {
  if (subscribers === null) return 'none';
  if (subscribers < 10_000) return 'small';
  if (subscribers < 100_000) return 'mid';
  if (subscribers < 1_000_000) return 'large';
  return 'huge';
}

function languageGroup(accounts: Account[]): Exclude<LanguageFilter, 'all'> {
  const language = creatorLocale(accounts).language;
  if (!language) return 'unknown';
  return language === 'fr' || language === 'en' ? language : 'other';
}

function hasPlatform(accounts: Account[], platform: PlatformFilter): boolean {
  if (platform === 'none') return accounts.length === 0;
  if (platform === 'other') return accounts.some(account => account.platform !== 'youtube' && account.platform !== 'podcast');
  return platform === 'all' || accounts.some(account => account.platform === platform);
}

export function matchesFilters(creator: AdminCreatorFacts, filters: CreatorFilters): boolean {
  return hasPlatform(creator.accounts, filters.platform)
    && (filters.language === 'all' || languageGroup(creator.accounts) === filters.language)
    && (filters.audience === 'all' || audienceBracket(creatorSubscribers(creator.accounts)) === filters.audience);
}

export const activeFilters = (filters: CreatorFilters) => Object.values(filters).filter(value => value !== 'all').length;

/**
 * À contacter : sur le site, mais il ne nous connaît pas encore (aucun compte prouvé, pas d'espace créateur, pas de
 * revendication en cours). C'est à lui qu'on peut proposer de revendiquer sa page.
 */
export function isToContact(creator: AdminCreatorFacts): boolean {
  return creator.visible > 0 && !creator.inTouch && creator.level !== 'verified'
    && !creator.accounts.some(account => account.claimStatus === 'verified' || account.claimStatus === 'pending');
}

/** Qui contacter d'abord : celui dont les codes sont le plus copiés, puis la plus grande audience, puis les notes. */
export function contactOrder(a: AdminCreatorFacts, b: AdminCreatorFacts): number {
  return b.copies - a.copies
    || (creatorSubscribers(b.accounts) ?? -1) - (creatorSubscribers(a.accounts) ?? -1)
    || (creatorRatings(b.accounts) ?? -1) - (creatorRatings(a.accounts) ?? -1)
    || a.name.localeCompare(b.name, 'fr');
}

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

/** « 12 k abonnés », « 5,3 k notes » ou null : l'audience en une courte mention pour une ligne de tableau. */
export function audienceShort(accounts: Account[]): string | null {
  const subscribers = creatorSubscribers(accounts);
  if (subscribers !== null) return `${compact.format(subscribers)} abonné${subscribers > 1 ? 's' : ''}`;
  const ratings = creatorRatings(accounts);
  return ratings !== null ? `${compact.format(ratings)} note${ratings > 1 ? 's' : ''}` : null;
}
