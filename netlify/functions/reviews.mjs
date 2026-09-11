import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export function createHandler(storeFactory) {
  return async (request) => {
    if (!['GET', 'POST'].includes(request.method)) return json({ message: 'Method not allowed.' }, 405);
    try {
      const store = storeFactory();
      if (request.method === 'GET') {
        const { blobs } = await store.list();
        const keys = blobs.map(blob => blob.key).sort().reverse().slice(0, 100);
        const reviews = await Promise.all(keys.map(key => store.get(key, { type: 'json' })));
        return json(reviews.filter(Boolean));
      }
      const text = await request.text();
      if (text.length > 16000) return json({ message: 'Review is too long.' }, 413);
      let data;
      try { data = JSON.parse(text); } catch { return json({ message: 'Invalid review.' }, 400); }
      const { name, rating, message } = data || {};
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 60 ||
          typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 1000 ||
          !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return json({ message: 'Enter a name (up to 60 characters), a 1–5 star rating, and a review of 10–1,000 characters.' }, 400);
      }
      const review = { id: randomUUID(), name: name.trim(), rating, message: message.trim(), createdAt: new Date().toISOString() };
      // Separate keys prevent concurrent submissions from overwriting one another.
      await store.setJSON(`${review.createdAt}-${review.id}`, review);
      return json(review, 201);
    } catch {
      return json({ message: 'Reviews are temporarily unavailable. Please try again.' }, 503);
    }
  };
}

export default createHandler(() => getStore({ name: 'nexora-reviews', consistency: 'strong' }));
