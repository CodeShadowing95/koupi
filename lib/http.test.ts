import { describe, expect, it } from 'vitest';
import { readJsonBody } from './http';

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api', { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers } });

describe('readJsonBody', () => {
  it('parses a small JSON object', async () => {
    expect(await readJsonBody(post('{"a":1}'), 100)).toEqual({ ok: true, data: { a: 1 } });
  });

  it('rejects a body larger than the limit', async () => {
    expect(await readJsonBody(post(JSON.stringify({ a: 'x'.repeat(200) })), 100)).toEqual({ ok: false, status: 413 });
  });

  it('rejects early when content-length announces a large body', async () => {
    expect(await readJsonBody(post('{}', { 'content-length': '5000' }), 100)).toEqual({ ok: false, status: 413 });
  });

  it('rejects invalid JSON and non-objects', async () => {
    expect(await readJsonBody(post('not json'), 100)).toEqual({ ok: false, status: 400 });
    expect(await readJsonBody(post('[1,2]'), 100)).toEqual({ ok: false, status: 400 });
  });
});
