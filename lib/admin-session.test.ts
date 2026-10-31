import { describe, expect, it } from 'vitest';
import { ADMIN_SESSION_SECONDS, createAdminToken, safeEqual, verifyAdminToken } from './admin-session';

const secret = 'test-secret-with-enough-length';

describe('admin session', () => {
  it('accepts a token it signed', async () => {
    expect(await verifyAdminToken(await createAdminToken(secret), secret)).toBe(true);
  });

  it('rejects the old static cookie value', async () => {
    expect(await verifyAdminToken('authenticated', secret)).toBe(false);
  });

  it('rejects a token signed with another secret', async () => {
    expect(await verifyAdminToken(await createAdminToken('other-secret'), secret)).toBe(false);
  });

  it('rejects a token whose expiry was changed', async () => {
    const [, signature] = (await createAdminToken(secret)).split('.');
    expect(await verifyAdminToken(`9999999999.${signature}`, secret)).toBe(false);
  });

  it('rejects an expired token', async () => {
    const now = Date.now();
    const token = await createAdminToken(secret, now);
    expect(await verifyAdminToken(token, secret, now + (ADMIN_SESSION_SECONDS + 1) * 1000)).toBe(false);
  });

  it('rejects everything when SESSION_SECRET is missing', async () => {
    expect(await verifyAdminToken(await createAdminToken(secret), undefined)).toBe(false);
    expect(await verifyAdminToken(undefined, secret)).toBe(false);
  });

  it('compares strings exactly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
