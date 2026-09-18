import { get, list, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export function createHandler(store = { get, list, put }) {
  return async function handler(request) {
    if (!['GET', 'POST'].includes(request.method)) return json({ message: 'Method not allowed.' }, 405);
    try {
      if (request.method === 'GET') {
        const blobs = [];
        let cursor;
        do {
          const page = await store.list({ prefix: 'reviews/', limit: 1000, cursor });
          blobs.push(...page.blobs);
          cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor);
        const recent = blobs.sort((a, b) => b.pathname.localeCompare(a.pathname)).slice(0, 100);
        const reviews = await Promise.all(recent.map(async ({ pathname }) => {
          const blob = await store.get(pathname, { access: 'private', useCache: false });
          return blob ? JSON.parse(await new Response(blob.stream).text()) : null;
        }));
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
      await store.put(`reviews/${review.createdAt}-${review.id}.json`, JSON.stringify(review), {
        access: 'private', contentType: 'application/json', addRandomSuffix: false,
      });
      return json(review, 201);
    } catch {
      return json({ message: 'Reviews are temporarily unavailable. Please try again.' }, 503);
    }
  };
}

export default { fetch: createHandler() };
