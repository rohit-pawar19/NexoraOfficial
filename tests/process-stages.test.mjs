import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { selectProcessStage } from '../src/process/process-stage-state.js';
import { createProcessStageModel, PROCESS_SCENES } from '../src/process/process-stage-models.js';
import { createProcessStageDirector } from '../src/process/process-stage-director.js';

test('stage selection rejects midpoint jitter and follows large forward/backward scrolls', () => {
  let stage = 2;
  for (const position of [2.49, 2.51, 2.48, 2.55, 2.52]) stage = selectProcessStage(position / 7, stage);
  assert.equal(stage, 2);
  stage = selectProcessStage(2.61 / 7, stage);
  assert.equal(stage, 3);
  for (const position of [2.5, 2.46, 2.51]) stage = selectProcessStage(position / 7, stage);
  assert.equal(stage, 3);
  assert.equal(selectProcessStage(.99, stage), 7);
  assert.equal(selectProcessStage(.01, 7), 0);
});

for (const [index, name] of PROCESS_SCENES.entries()) {
  test(`${name}: reveal/idle transforms fit the tunnel and GPU resources dispose`, () => {
    const model = createProcessStageModel(index), resources = new Set(), released = new Set();
    let vertices = 0;
    model.object.traverse(part => {
      if (part.geometry) { resources.add(part.geometry); vertices += part.geometry.attributes.position.count; }
      if (part.material) resources.add(part.material);
    });
    assert.ok(vertices < 70_000);
    for (const reveal of [0, .2, .65, 1]) for (const time of [0, 3, 60]) {
      model.update(reveal, time); model.object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model.object);
      assert.ok([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite));
      assert.ok(bounds.getSize(new THREE.Vector3()).length() < 3);
    }
    resources.forEach(resource => resource.addEventListener('dispose', () => released.add(resource)));
    model.dispose(); model.dispose();
    assert.equal(released.size, resources.size);
  });
}

test('scene director avoids restarts, skips obsolete destinations and keeps only one model', () => {
  const mounted = [], released = [], updates = [];
  const director = createProcessStageDirector(index => {
    mounted.push(index);
    return { object: new THREE.Group(), update: (reveal, time) => updates.push({ index, reveal, time }), dispose: () => released.push(index) };
  });
  const advance = seconds => gsap.globalTimeline.time(gsap.globalTimeline.time() + seconds, false);
  director.setStage(0);
  for (let i = 0; i < 20; i++) director.setStage(0);
  assert.deepEqual(mounted, [0]);
  advance(2); director.update(.03);
  assert.ok(updates.at(-1).reveal > .99, 'a stationary step must complete its reveal');
  const time = updates.at(-1).time;
  director.update(.03);
  assert.ok(updates.at(-1).time > time, 'stationary steps retain gentle idle updates');
  director.setStage(1); director.setStage(2); director.setStage(4);
  advance(.4);
  assert.equal(director.stage, 4);
  assert.deepEqual(mounted, [0, 4]);
  assert.deepEqual(released, [0]);
  assert.equal(director.root.children.length, 1);
  director.setStage(2); advance(.4);
  assert.equal(director.stage, 2, 'upward scrolling restores the preceding miniature');
  director.pause(true);
  const updateCount = updates.length; director.update(10);
  assert.equal(updates.length, updateCount, 'hidden scenes must not update');
  director.dispose(); gsap.ticker.sleep();
  assert.deepEqual(released, [0, 4, 2]);
});
