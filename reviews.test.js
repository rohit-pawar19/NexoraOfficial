const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const createRouter = require('./reviews');
const vm = require('node:vm');

test('review client handles empty, HTML and error responses without JSON errors', async () => {
    const source = await fs.readFile('js/reviews.js', 'utf8');
    const helpers = source.slice(source.indexOf('const unavailable'), source.indexOf('let current'));
    const readResponse = vm.runInNewContext(`const isStaticPreview = false; ${helpers}; readResponse;`);
    for (const response of [new Response(''), new Response('<html>Not found</html>', { status: 404 })]) {
        await assert.rejects(readResponse(response), /review service is unavailable/i);
    }
    await assert.rejects(readResponse(new Response('{"message":"Try again"}', { status: 503 })), /Try again/);
    assert.equal((await readResponse(new Response('{"id":"saved"}'))).id, 'saved');
});

test('reviews validate, persist concurrent submissions and stream live updates', async () => {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-reviews-'));
    const file = path.join(folder, 'reviews.json');
    const servers = [];
    const start = async () => {
        const app = express();
        app.use(express.json());
        app.use('/api/reviews', createRouter(file));
        const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
        servers.push(server);
        return `http://127.0.0.1:${server.address().port}/api/reviews`;
    };
    const abort = new AbortController();
    try {
        const url = await start();
        assert.deepEqual(await (await fetch(url)).json(), []);
        const post = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        assert.equal((await post({ name: ' ', rating: 6, message: 'short' })).status, 400);
        assert.equal((await post({ name: 'Name', rating: '5', message: 'A complete review.' })).status, 400);
        const stream = await fetch(`${url}/stream`, { signal: abort.signal });
        const reader = stream.body.getReader();
        assert.match(new TextDecoder().decode((await reader.read()).value), /data: \[\]/);
        const responses = await Promise.all(Array.from({ length: 5 }, (_, i) => post({
            name: `Client ${i}`, rating: 5, message: 'Helpful team and excellent communication.'
        })));
        assert.ok(responses.every(response => response.status === 201));
        assert.match(new TextDecoder().decode((await reader.read()).value), /Client/);
        abort.abort();
        const reviews = await (await fetch(url)).json();
        assert.equal(reviews.length, 5);
        assert.equal(new Set(reviews.map(review => review.id)).size, 5);
        const reopened = await start();
        assert.deepEqual(await (await fetch(reopened)).json(), reviews);
        const markup = '<img src=x onerror=alert(1)>';
        const saved = await (await post({ name: markup, rating: 4, message: markup })).json();
        assert.equal(saved.message, markup);
        assert.match(await fs.readFile('js/reviews.js', 'utf8'), /message\.textContent = review\.message/);
    } finally {
        abort.abort();
        for (const server of servers) {
            server.closeAllConnections();
            await new Promise(resolve => server.close(resolve));
        }
        assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(folder).startsWith('nexora-reviews-'));
        await fs.rm(folder, { recursive: true, force: true });
    }
});
