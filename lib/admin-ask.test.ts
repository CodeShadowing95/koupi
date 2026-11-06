import { describe, expect, it } from 'vitest';
import { splitQuestion } from './admin-ask';

describe('splitQuestion', () => {
  it('sépare la question de son explication', () => {
    expect(splitQuestion('Archiver NordVPN ? L’outil et ses codes disparaissent du site.')).toEqual({ title: 'Archiver NordVPN ?', message: 'L’outil et ses codes disparaissent du site.' });
  });
  it('garde une question seule sans explication', () => {
    expect(splitQuestion('Remettre le site en ligne pour tout le monde ?')).toEqual({ title: 'Remettre le site en ligne pour tout le monde ?', message: null });
  });
  it('ne coupe pas sur un « ? » collé à un mot (adresse)', () => {
    expect(splitQuestion('Ouvrir https://a.fr/?x=1 ? Oui.')).toEqual({ title: 'Ouvrir https://a.fr/?x=1 ?', message: 'Oui.' });
  });
  it('rend un texte sans question tel quel', () => {
    expect(splitQuestion('  Confirmer  ')).toEqual({ title: 'Confirmer', message: null });
  });
});
