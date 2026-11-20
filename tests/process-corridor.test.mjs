import test from 'node:test';
import assert from 'node:assert/strict';
import { createProcessCorridorModel, journeyPosition, PROCESS_STAGE_COUNT } from '../src/process/process-corridor-model.js';

test('natural scroll visits all eight stages in order and can be reversed without accumulated drift', () => {
  const seen = new Set();
  let previousZ = Infinity;
  for (let i = 0; i <= 1000; i++) {
    const pose = journeyPosition(i / 1000);
    seen.add(pose.stage);
    assert.ok(pose.cameraZ <= previousZ);
    previousZ = pose.cameraZ;
  }
  assert.equal(seen.size, PROCESS_STAGE_COUNT);
  assert.equal(journeyPosition(0).stage, 0);
  assert.equal(journeyPosition(1).stage, 7);
  assert.equal(journeyPosition(-1).stage, 0);
  assert.equal(journeyPosition(2).stage, 7);
  const model = createProcessCorridorModel();
  const snapshots = [];
  for (const progress of [.1, .4, .8]) {
    model.update(progress); model.object.updateMatrixWorld(true);
    snapshots.push(model.object.children.map(child => child.matrixWorld.toArray()));
  }
  for (const [index, progress] of [[2, .8], [1, .4], [0, .1]]) {
    model.update(progress); model.object.updateMatrixWorld(true);
    assert.deepEqual(model.object.children.map(child => child.matrixWorld.toArray()), snapshots[index]);
  }
  model.dispose();
});

test('Grow widens the corridor only near the final stage; all transforms remain finite', () => {
  const model = createProcessCorridorModel();
  assert.equal(journeyPosition(.7).opening, 0);
  assert.equal(journeyPosition(1).opening, 1);
  for (let i = 0; i <= 100; i++) {
    model.update(i / 100); model.object.updateMatrixWorld(true);
    model.object.traverse(object => assert.ok(object.matrixWorld.toArray().every(Number.isFinite)));
  }
  model.dispose();
});

test('corridor releases all rendered geometry and materials', () => {
  const model = createProcessCorridorModel(), resources = new Set(), disposed = new Set();
  model.object.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    if (object.material) resources.add(object.material);
  });
  resources.forEach(resource => resource.addEventListener('dispose', () => disposed.add(resource)));
  model.dispose(); model.dispose();
  assert.equal(disposed.size, resources.size);
});
