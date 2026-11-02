// Cloche de notifications du back-office : ce qui demande l'attention de l'admin.
// Fonctions pures : l'API (app/api/admin/notifications) construit la liste, le navigateur retient ce qui a été vu.
import type { Code } from './data';
import { flaggedCodes, RETEST_DAYS, staleCodes } from './admin-stats';

export type NotificationTone = 'bad' | 'warn' | 'info';
/** Onglet du panneau : propositions de visiteurs, codes signalés, rappels de tests. */
export type NotificationKind = 'proposal' | 'flag' | 'reminder';
export type AdminNotification = {
  /** Identifiant stable : une notification vue ne revient comme « nouvelle » que si son contenu change (ex. le nombre de codes). */
  id: string;
  tone: NotificationTone;
  kind: NotificationKind;
  /** Début du texte, en gras (le code, le nombre de codes), suivi de text. */
  subject: string;
  text: string;
  /** Texte complet, pour les lecteurs d'écran et les exports. */
  title: string;
  detail: string;
  href: string;
  /** Date ISO de l'événement, null pour un rappel sans date (codes à retester…). */
  at: string | null;
  /** Proposition concernée : permet de la refuser depuis la cloche. */
  proposalId?: string;
};

export const NOTIFICATION_TABS = ['all', 'proposal', 'flag', 'reminder'] as const;
export type NotificationTab = typeof NOTIFICATION_TABS[number];
export const NOTIFICATION_TAB_LABELS: Record<NotificationTab, string> = { all: 'Tout', proposal: 'Propositions', flag: 'Signalés', reminder: 'Rappels' };

/** Nombre de notifications par onglet. */
export function countByTab(items: AdminNotification[]): Record<NotificationTab, number> {
  const counts: Record<NotificationTab, number> = { all: items.length, proposal: 0, flag: 0, reminder: 0 };
  for (const item of items) counts[item.kind] += 1;
  return counts;
}

const make = (item: Omit<AdminNotification, 'title'>): AdminNotification => ({ ...item, title: `${item.subject} ${item.text}` });

export const NOTIFICATIONS_SEEN_KEY = 'koupi-admin-notifications-seen';
const MAX_PROPOSALS = 10;
const MAX_FLAGS = 5;

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;
const q = (value: string) => encodeURIComponent(value);

export function buildNotifications(input: {
  proposals: { id: string; code: string; toolName: string; creatorName: string; createdAt: Date | string }[];
  codes: Code[];
}, now = new Date()): AdminNotification[] {
  const list: AdminNotification[] = input.proposals
    .map(item => ({ ...item, at: new Date(item.createdAt).toISOString() }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_PROPOSALS)
    .map(item => make({
      id: `proposal-${item.id}`, tone: 'info', kind: 'proposal', subject: item.code, text: `proposé pour ${item.toolName}`,
      detail: `Crédité à ${item.creatorName}`, href: `/admin/propositions?q=${q(item.code)}`, at: item.at, proposalId: item.id,
    }));
  for (const code of flaggedCodes(input.codes).slice(0, MAX_FLAGS)) list.push(make({
    id: `flag-${code.id}-${code.votes}`, tone: 'bad', kind: 'flag', subject: code.code, text: 'signalé par les visiteurs',
    detail: `${code.tool} · ${plural(code.votes, 'vote')}, ${code.success} % de réussite`, href: `/admin/codes?q=${q(code.code)}`, at: null,
  }));
  const stale = staleCodes(input.codes, now).length;
  if (stale) list.push(make({
    id: `retest-${stale}`, tone: 'warn', kind: 'reminder', subject: plural(stale, 'code'), text: 'à retester',
    detail: `Vérifiés il y a plus de ${RETEST_DAYS} jours ou jamais datés`, href: '/admin/codes?status=retest', at: null,
  }));
  const toTest = input.codes.filter(code => !code.archived && code.status === 'to_test').length;
  if (toTest) list.push(make({
    id: `to-test-${toTest}`, tone: 'warn', kind: 'reminder', subject: plural(toTest, 'code'), text: 'à tester',
    detail: 'Visibles sur le site, pas encore essayés', href: '/admin/codes?status=to_test', at: null,
  }));
  return list;
}

/** Notifications pas encore vues. */
export function unseen(items: AdminNotification[], seen: string[]): AdminNotification[] {
  const known = new Set(seen);
  return items.filter(item => !known.has(item.id));
}

/** Ids à garder comme lus : ceux déjà lus qui existent encore, plus les nouveaux (la liste ne grossit pas sans fin). */
export function markRead(items: AdminNotification[], seen: string[], ids: string[]): string[] {
  const current = new Set(items.map(item => item.id));
  return [...new Set([...seen.filter(id => current.has(id)), ...ids])];
}

/** Lit la liste des notifications vues (tolère une valeur absente ou abîmée). */
export function parseSeen(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 200) : [];
  } catch { return []; }
}

/** « à l'instant », « il y a 5 min », « il y a 3 h », « hier », « il y a 4 j », puis la date. */
export function timeAgo(at: string, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(at).getTime()) / 60_000));
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;
  return new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
