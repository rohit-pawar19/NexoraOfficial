import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from './api/reviews.mjs';

test('Vercel reviews persist, validate, and return newest submissions', async () => {
  const records = new Map();
  const handler = createHandler({
    list: async () => ({ blobs: [...records.keys()].map(pathname => ({ pathname })), hasMore: false }),
    get: async pathname => ({ stream: new Response(records.get(pathname)).body }),
    put: async (pathname, body) => { records.set(pathname, body); },
  });
  const url = 'https://example.com/api/reviews';
  const post = data => new Request(url, { method: 'POST', body: JSON.stringify(data) });
  assert.deepEqual(await (await handler(new Request(url))).json(), []);
  assert.equal((await handler(post({ name: 'Test', rating: 6, message: 'A valid review.' }))).status, 400);
  const responses = await Promise.all(Array.from({ length: 5 }, (_, i) =>
    handler(post({ name: `Client ${i}`, rating: 5, message: 'A valid review.' }))));
  assert.ok(responses.every(response => response.status === 201));
  const reviews = await (await handler(new Request(url))).json();
  assert.equal(reviews.length, 5);
  assert.equal(new Set(reviews.map(review => review.id)).size, 5);
});
