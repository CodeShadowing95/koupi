import { describe, expect, it } from 'vitest';
import { createAdminToken, verifyAdminToken } from './admin-session';
import { CREATOR_SESSION_SECONDS, createCreatorToken, readCreatorToken } from './creator-session';

const secret = 'a'.repeat(40);
const userId = '3f1c2b4a-1111-4222-8333-444455556666';
const now = Date.UTC(2026, 10, 3, 12);

describe('session créateur', () => {
  it('rend l’id du créateur tant que le cookie est valide', async () => {
    const token = await createCreatorToken(userId, secret, now);
    expect(await readCreatorToken(token, secret, now)).toBe(userId);
    expect(await readCreatorToken(token, secret, now + (CREATOR_SESSION_SECONDS + 1) * 1000)).toBeNull();
  });
  it('refuse un cookie falsifié, un autre secret ou un id changé', async () => {
    const token = await createCreatorToken(userId, secret, now);
    expect(await readCreatorToken(token, 'b'.repeat(40), now)).toBeNull();
    expect(await readCreatorToken(token.replace(userId, '3f1c2b4a-1111-4222-8333-444455556667'), secret, now)).toBeNull();
    expect(await readCreatorToken(`${token}.x`, secret, now)).toBeNull();
    expect(await readCreatorToken(undefined, secret, now)).toBeNull();
    expect(await readCreatorToken(token, undefined, now)).toBeNull();
  });
  it('ne se confond jamais avec la session admin', async () => {
    const admin = await createAdminToken(secret, now);
    expect(await readCreatorToken(admin, secret, now)).toBeNull();
    expect(await verifyAdminToken(await createCreatorToken(userId, secret, now), secret, now)).toBe(false);
  });
});
