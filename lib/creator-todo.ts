// Ce qu'il reste à faire pour un créateur, en tête de son panneau dans l'admin : une phrase par tâche, et l'onglet où la faire.
// Sans base ni réseau : importable par les composants client.
import type { AdminCreatorAccount } from './creator-accounts-display';
import type { CreatorLevel } from './verification';

export type CreatorTab = 'overview' | 'accounts' | 'trust';
export type CreatorTodo = { text: string; tab: CreatorTab | 'profile' };

export function creatorTodos(creator: { level: CreatorLevel; bio: string | null; accounts: AdminCreatorAccount[] }): CreatorTodo[] {
  const todos: CreatorTodo[] = [];
  if (creator.accounts.length === 0) todos.push({ text: 'Relier sa chaîne ou son profil', tab: 'accounts' });
  else if (creator.level === 'spotted') todos.push({ text: 'Contrôler un de ses comptes', tab: 'trust' });
  if (creator.accounts.some(account => account.platform === 'youtube' && account.externalId && !account.watch?.active)) {
    todos.push({ text: 'Suivre les vidéos de sa chaîne', tab: 'accounts' });
  }
  if (!creator.bio?.trim()) todos.push({ text: 'Écrire sa présentation', tab: 'profile' });
  return todos;
}
