import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { INDUSTRY_WORLDS, WORLD_DURATIONS, createIndustryWorld } from '../src/industries/industry-models.js';

for (const type of INDUSTRY_WORLDS) {
  test(`${type}: construction and settled poses stay finite and fit the miniature envelope`, () => {
    const model = createIndustryWorld(type);
    let vertices = 0;
    const resources = new Set();
    model.object.traverse(object => {
      if (!object.isMesh) return;
      vertices += object.geometry.getAttribute('position').count;
      resources.add(object.geometry);
      for (const material of [object.material].flat()) {
        resources.add(material);
        Object.values(material).forEach(value => { if (value?.isTexture) resources.add(value); });
      }
    });
    assert.ok(vertices < 140_000, `${vertices} vertices exceed the miniature budget`);
    for (const progress of [0, .15, .35, .65, 1]) {
      for (const time of [0, 5, 30]) {
        model.update(progress, time, { x: .9, y: -.8 });
        model.object.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model.object);
        assert.ok([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite));
        assert.ok(bounds.getSize(new THREE.Vector3()).length() < 5);
      }
    }
    const disposed = new Set();
    resources.forEach(resource => resource.addEventListener('dispose', () => disposed.add(resource)));
    model.dispose();
    assert.equal(disposed.size, resources.size, 'all miniature geometry, materials and textures must be released');
  });
}

test('industry worlds have distinct camera treatments and entrance durations', () => {
  const worlds = INDUSTRY_WORLDS.map(createIndustryWorld);
  assert.equal(new Set(worlds.map(world => JSON.stringify(world.camera))).size, 3);
  assert.equal(new Set(Object.values(WORLD_DURATIONS)).size, 3);
  worlds.forEach(world => world.dispose());
});
