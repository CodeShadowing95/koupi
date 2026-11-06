import { describe, expect, it } from 'vitest';
import { withTimeout } from './timeout-fetch';

// Un faux service qui ne répond jamais, sauf si l'appel est coupé.
const hanging: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
  init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
});

describe('withTimeout', () => {
  it('cuts a call that takes too long', async () => {
    await expect(withTimeout(hanging, 20)('https://example.test')).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('lets a fast answer through with the same request options', async () => {
    let seen: RequestInit | undefined;
    const fast: typeof fetch = async (_input, init) => { seen = init; return new Response('ok'); };
    const response = await withTimeout(fast, 1000)('https://example.test', { method: 'POST', body: 'x' });
    expect(await response.text()).toBe('ok');
    expect(seen?.method).toBe('POST');
    expect(seen?.signal).toBeInstanceOf(AbortSignal);
  });

  it('keeps the caller signal', async () => {
    const controller = new AbortController();
    const call = withTimeout(hanging, 5000)('https://example.test', { signal: controller.signal });
    controller.abort(new Error('stopped by caller'));
    await expect(call).rejects.toThrow('stopped by caller');
  });
});
