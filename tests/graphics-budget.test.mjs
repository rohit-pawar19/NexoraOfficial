import assert from 'node:assert/strict';
import { test } from 'node:test';

const gl = {
  MAX_TEXTURE_SIZE: 1,
  getParameter() { return 16384; },
  getExtension() { return { loseContext() {} }; },
};

function setDevice({ width = 390, height = 844, dpr = 3, hardware = {}, context = gl } = {}) {
  Object.defineProperties(globalThis, {
    navigator: { configurable: true, value: hardware },
    innerWidth: { configurable: true, value: width },
    innerHeight: { configurable: true, value: height },
    devicePixelRatio: { configurable: true, value: dpr },
    document: {
      configurable: true,
      value: {
        createElement() { return { getContext(kind) { return kind === 'webgl2' ? context : null; } }; },
        documentElement: { classList: { contains() { return false; } } },
      },
    },
  });
}

test('quality uses GPU and hardware hints without using mobile width as a tier', async () => {
  setDevice({ hardware: { deviceMemory: 8, hardwareConcurrency: 8 } });
  const high = await import('../src/motion/graphics-budget.js?high');
  assert.equal(high.graphicsProfile().level, 'high');

  setDevice({ width: 1400, dpr: 1, hardware: { deviceMemory: 2 } });
  const low = await import('../src/motion/graphics-budget.js?low');
  assert.equal(low.graphicsProfile().level, 'low');

  setDevice({ hardware: { deviceMemory: 4, hardwareConcurrency: 8 } });
  const medium = await import('../src/motion/graphics-budget.js?medium');
  assert.equal(medium.graphicsProfile().level, 'medium');

  setDevice({ dpr: 1 });
  const unknown = await import('../src/motion/graphics-budget.js?unknown');
  assert.equal(unknown.graphicsProfile().level, 'high');

  setDevice({ context: null });
  const unsupported = await import('../src/motion/graphics-budget.js?unsupported');
  assert.equal(unsupported.canRenderGraphics(), false);
});

test('monitor ignores a short dip and steps down only under sustained pressure', async () => {
  setDevice({ dpr: 1 });
  const budget = await import('../src/motion/graphics-budget.js?monitor');
  const monitor = budget.createGraphicsMonitor();
  let now = 0;
  function sampleFor(duration, interval) {
    const end = now + duration;
    while (now < end) {
      monitor.sample(now);
      now += interval;
    }
  }
  const changes = [];
  const stop = budget.watchGraphics(() => {
    changes.push(budget.graphicsExhausted() ? 'still' : budget.graphicsProfile().level);
  });
  assert.equal(budget.graphicsProfile().level, 'high');
  sampleFor(700, 65);
  sampleFor(3800, 16);
  assert.equal(budget.graphicsProfile().level, 'high');

  monitor.reset();
  for (const tier of ['medium', 'low', 'still']) {
    const interval = tier === 'still' ? 1000 : 60;
    sampleFor(tier === 'still' ? 3000 : 2200, interval);
    assert.notEqual(budget.graphicsExhausted() ? 'still' : budget.graphicsProfile().level, tier);
    sampleFor(2000, interval);
    await Promise.resolve();
    assert.equal(changes.at(-1), tier);
  }
  assert.deepEqual(changes, ['medium', 'low', 'still']);
  stop();
});
