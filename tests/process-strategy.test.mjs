import test from 'node:test';
import assert from 'node:assert/strict';
import { createProcessStageModel, PROCESS_SCENES } from '../src/process/process-stage-models.js';

test('Plan assembles its strategy board and keeps completed connections visible during idle', () => {
  assert.equal(PROCESS_SCENES[1], 'Plan');
  const model = createProcessStageModel(1);
  const board = model.object.getObjectByName('strategy-floating-board');
  const needle = model.object.getObjectByName('strategy-compass-needle');
  const links = [], markers = [], cards = [];
  model.object.traverse(part => {
    if (part.name.startsWith('strategy-connection-')) links.push(part);
    if (part.name.startsWith('strategy-marker-')) markers.push(part);
    if (part.name.startsWith('strategy-planning-card-')) cards.push(part);
  });
  assert.ok(board && needle);
  assert.equal(links.length, 5); assert.equal(markers.length, 5); assert.equal(cards.length, 3);
  model.update(0, 0);
  assert.ok(links.every(link => link.geometry.drawRange.count === 0));
  model.update(1, 3);
  assert.ok(links.every(link => link.geometry.drawRange.count === link.geometry.index.count));
  const y = board.position.y, angle = needle.rotation.y;
  model.update(1, 5);
  assert.notEqual(needle.rotation.y, angle);
  assert.notEqual(board.position.y, y);
  assert.ok(Math.abs(board.position.y - y) < .02);
  assert.ok(links.every(link => link.geometry.drawRange.count === link.geometry.index.count));
  assert.ok(cards.every(card => Math.abs(card.rotation.y) < 1e-10));
  assert.equal(model.object.getObjectByName('create-cinema-rig'), undefined);
  model.dispose();
});
