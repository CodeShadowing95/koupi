import { describe, expect, it } from 'vitest';
import { VOTE_FAILED, VOTE_THANKS, voteOutcome } from './vote-outcome';

describe('voteOutcome', () => {
  it('keeps the thumb lit when the server records the vote', () => {
    expect(voteOutcome(200)).toEqual({ kept: true, message: VOTE_THANKS });
  });

  it('keeps it lit when the vote was already counted', () => {
    expect(voteOutcome(409, 'Tu as déjà voté pour ce code.')).toEqual({ kept: true, message: 'Tu as déjà voté pour ce code.' });
    expect(voteOutcome(409).kept).toBe(true);
  });

  it('turns it off again on a refusal, with the server message', () => {
    expect(voteOutcome(429, 'Trop de votes. Réessaie plus tard.')).toEqual({ kept: false, message: 'Trop de votes. Réessaie plus tard.' });
    expect(voteOutcome(500)).toEqual({ kept: false, message: VOTE_FAILED });
  });

  it('turns it off again when the request never got through', () => {
    expect(voteOutcome(null)).toEqual({ kept: false, message: VOTE_FAILED });
  });
});
