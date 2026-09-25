import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.ts';

test('the Worker serves only the election mount with canonical URLs and keeps search query', async () => {
  const paths: string[] = [];
  const env = { ASSETS: { async fetch(request: Request) {
    const url = new URL(request.url);
    paths.push(url.pathname + url.search);
    return new Response('asset', { headers: { 'content-type': url.pathname.endsWith('.json') ? 'application/json' : 'text/html' } });
  } } };
  const call = (path: string, method = 'GET') => worker.fetch(new Request(`https://tfc-taiwan.org.tw${path}`, { method }), env);
  assert.equal((await call('/election2026')).status, 308);
  assert.equal((await call('/election2026/reports/')).headers.get('location'), 'https://tfc-taiwan.org.tw/election2026/reports');
  const oldSharedUrl = '/election2026/infographics/ai-tools/2%20%E8%A7%80%E5%AF%9F%E5%BD%B1%E5%83%8F';
  assert.equal((await call(oldSharedUrl)).headers.get('location'), 'https://tfc-taiwan.org.tw/election2026/infographics/ai-tools/2');
  assert.equal((await call('/outside')).status, 404);
  assert.equal((await call('/election2026/', 'POST')).status, 405);
  assert.equal((await call('/election2026/reports?category=地方選舉')).status, 200);
  assert.deepEqual(paths, ['/election2026/reports/?category=%E5%9C%B0%E6%96%B9%E9%81%B8%E8%88%89']);
  const json = await call('/election2026/data/listings.json');
  assert.equal(json.headers.get('x-robots-tag'), 'noindex');
  assert.equal(json.headers.get('cache-control'), 'no-cache');
});
