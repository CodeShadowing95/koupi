import { describe, expect, it } from 'vitest';
import type { AdminCreatorAccount } from './creator-accounts-display';
import { creatorTodos } from './creator-todo';

const account = (extra: Partial<AdminCreatorAccount> = {}): AdminCreatorAccount => ({
  id: 'a', platform: 'youtube', externalId: 'UC1', handle: '@ana', url: 'https://youtube.com/@ana', subscribers: 1000, subscribersAt: null,
  metrics: {}, metricsAt: null, platformVerified: false, adminCheckedAt: null, level: 'spotted', claimStatus: 'none', claimCode: null, claimCodeAt: null, claimedAt: null,
  ...extra,
});

describe('creatorTodos', () => {
  it('sans compte : relier un compte et écrire la présentation', () => {
    expect(creatorTodos({ level: 'spotted', bio: null, accounts: [] })).toEqual([
      { text: 'Relier sa chaîne ou son profil', tab: 'accounts' },
      { text: 'Écrire sa présentation', tab: 'profile' },
    ]);
  });

  it('repéré avec une chaîne : la contrôler et suivre ses vidéos', () => {
    expect(creatorTodos({ level: 'spotted', bio: 'Tech', accounts: [account()] }).map(todo => todo.tab)).toEqual(['trust', 'accounts']);
  });

  it('rien à faire quand il est contrôlé, suivi et présenté', () => {
    expect(creatorTodos({ level: 'checked', bio: 'Tech', accounts: [account({ level: 'checked', watch: { active: true, lastFetchedAt: null } })] })).toEqual([]);
  });
});
