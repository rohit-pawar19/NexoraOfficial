import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from './netlify/functions/reviews.mjs';

test('Netlify reviews validate, preserve concurrent submissions and report storage failures', async () => {
  const records = new Map();
  const handler = createHandler(() => ({
    list: async () => ({ blobs: [...records.keys()].map(key => ({ key })) }),
    get: async key => records.get(key),
    setJSON: async (key, value) => { records.set(key, value); },
  }));
  const get = () => new Request('https://example.com/api/reviews');
  const post = data => new Request(get(), { method: 'POST', body: JSON.stringify(data) });
  assert.deepEqual(await (await handler(get())).json(), []);
  assert.equal((await handler(post({ name: 'Test', rating: 6, message: 'A test review.' }))).status, 400);
  const results = await Promise.all(Array.from({ length: 5 }, (_, i) => handler(post({ name: `Test ${i}`, rating: 5, message: 'A valid test review.' }))));
  assert.ok(results.every(result => result.status === 201));
  const reviews = await (await handler(get())).json();
  assert.equal(reviews.length, 5);
  assert.equal(new Set(reviews.map(review => review.id)).size, 5);
  const failing = createHandler(() => { throw new Error('Storage unavailable'); });
  assert.equal((await failing(get())).status, 503);
});
