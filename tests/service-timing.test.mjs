import test from 'node:test';
import assert from 'node:assert/strict';
import { gsap } from 'gsap';
import { createServiceEntrance, SERVICE_TIMING } from '../src/services/service-timing.js';

test('hover sequence reserves the reveal window and completes assembly at 2.5 seconds', () => {
  const card = { y: 0 };
  const visual = { autoAlpha: 0, scale: 1, '--mini-sweep': '-30%', '--mini-sweep-opacity': 0 };
  const motion = { hover: 0, reveal: 0, assembly: 0 };
  let completed = 0;
  const sequence = createServiceEntrance(card, { visual, motion }, () => completed++);
  assert.equal(sequence.paused(), true, 'creating a sequence must not start it');
  sequence.time(.1, false);
  assert.equal(motion.reveal, 0);
  assert.equal(motion.assembly, 0);
  sequence.time(SERVICE_TIMING.revealEnd, false);
  assert.equal(motion.reveal, 1);
  assert.equal(visual.autoAlpha, 1);
  assert.equal(motion.assembly, 0);
  sequence.time(SERVICE_TIMING.assemblyEnd, false);
  assert.equal(motion.assembly, 1);
  assert.equal(completed, 1);
  assert.equal(sequence.duration(), 2.5);
  assert.equal(sequence.repeat(), 0, 'the reveal must never loop');
  assert.ok(SERVICE_TIMING.exit >= .4 && SERVICE_TIMING.exit <= .7);
  sequence.kill();
  gsap.ticker.sleep();
});

test('cancelled entrances cannot complete or invoke the hover-idle callback', () => {
  let completed = 0;
  const state = { visual: { autoAlpha: 0, scale: 1, '--mini-sweep': '-30%', '--mini-sweep-opacity': 0 }, motion: { hover: 0, reveal: 0, assembly: 0 } };
  const sequence = createServiceEntrance({ y: 0 }, state, () => completed++);
  sequence.time(.5, false);
  sequence.kill();
  gsap.globalTimeline.time(gsap.globalTimeline.time() + 5, false);
  assert.equal(completed, 0);
  assert.ok(state.motion.assembly < 1);
  gsap.ticker.sleep();
});
