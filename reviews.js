const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

module.exports = function createReviewsRouter(file) {
    const router = express.Router();
    const clients = new Set();
    let reviews = [];
    const ready = fs.readFile(file, 'utf8').then(contents => {
        reviews = JSON.parse(contents);
        if (!Array.isArray(reviews)) throw new Error('Invalid review storage');
    }).catch(error => { if (error.code !== 'ENOENT') throw error; });
    // Keep startup errors available to request handlers without an unhandled rejection.
    ready.catch(() => {});
    let writes = Promise.resolve();
    const snapshot = () => reviews.slice(0, 100);
    const broadcast = () => {
        const event = `data: ${JSON.stringify(snapshot())}\n\n`;
        clients.forEach(client => client.write(event));
    };

    router.get('/', async (req, res) => {
        try {
            await ready;
            res.set('Cache-Control', 'no-store').json(snapshot());
        } catch {
            res.status(503).json({ message: 'Reviews are temporarily unavailable.' });
        }
    });

    router.get('/stream', async (req, res) => {
        try { await ready; } catch {
            return res.status(503).end();
        }
        res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
            'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.flushHeaders();
        clients.add(res);
        res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
        const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 25000);
        res.on('close', () => { clearInterval(heartbeat); clients.delete(res); });
    });

    router.post('/', async (req, res) => {
        const { name, rating, message } = req.body || {};
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 60 ||
            typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 1000 ||
            !Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Enter a name (up to 60 characters), a 1–5 star rating, and a review of 10–1,000 characters.' });
        }
        const review = { id: randomUUID(), name: name.trim(), rating,
            message: message.trim(), createdAt: new Date().toISOString() };
        // Serialize writes and replace the file atomically before publishing.
        const save = writes.then(async () => {
            await ready;
            const next = [review, ...reviews];
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(`${file}.tmp`, JSON.stringify(next, null, 2), 'utf8');
            await fs.rename(`${file}.tmp`, file);
            reviews = next;
            broadcast();
        });
        writes = save.catch(() => {});
        try {
            await save;
            res.status(201).json(review);
        } catch {
            res.status(503).json({ message: 'Your review could not be saved. Please try again.' });
        }
    });
    return router;
};
