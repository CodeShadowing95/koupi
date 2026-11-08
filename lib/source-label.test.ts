import { describe, expect, it } from 'vitest';
import { episodeNumber, sourceAction, sourceLabel } from './source-label';

describe('episodeNumber', () => {
  it('lit le numéro écrit dans le titre', () => {
    expect(episodeNumber('#574 - Matthieu Stefani - Génération Do It Yourself')).toBe('574');
    expect(episodeNumber('GDIY #12 : Une histoire')).toBe('12');
    expect(episodeNumber('Épisode 3 : la suite')).toBe('3');
    expect(episodeNumber('Ep. 45 – Invité')).toBe('45');
    expect(episodeNumber('Les 10 erreurs à éviter')).toBeNull();
    expect(episodeNumber('C# pour les nuls')).toBeNull();
  });
});

describe('sourceLabel', () => {
  it('dit dans quel podcast et quel épisode le code a été entendu', () => {
    expect(sourceLabel({ sourceTitle: '#574 - Matthieu Stefani', podcast: 'GDIY' })).toBe('Entendu dans GDIY, épisode #574');
    expect(sourceLabel({ sourceTitle: 'Le vrai prix du cloud', podcast: 'Silicon Carne' })).toBe('Entendu dans Silicon Carne : Le vrai prix du cloud');
    expect(sourceLabel({ sourceTitle: '', podcast: 'Silicon Carne' })).toBe('Entendu dans Silicon Carne');
  });

  it('garde le titre de la source hors podcast', () => {
    expect(sourceLabel({ sourceTitle: 'Ma vidéo #3' })).toBe('Ma vidéo #3');
  });
});

describe('sourceAction', () => {
  it('dit en deux ou trois mots où vérifier le code', () => {
    expect(sourceAction('youtube')).toBe('Voir la vidéo');
    expect(sourceAction('tiktok')).toBe('Voir la vidéo');
    expect(sourceAction('podcast')).toBe('Écouter l’épisode');
    expect(sourceAction('instagram')).toBe('Voir le post');
    expect(sourceAction('other')).toBe('Voir la source');
    expect(sourceAction(null)).toBe('Voir la source');
  });
});
