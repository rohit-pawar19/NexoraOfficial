import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createIndustryWorld, frameIndustryCamera } from '../src/industries/industry-models.js';
import { INDUSTRY_WORLDS, WORLD_DURATIONS, WORLD_IDLE } from '../src/industries/industry-timing.js';

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

test('visible geometry stays inside the card viewport at narrow and wide aspect ratios', () => {
  const vertex = new THREE.Vector3();
  for (const type of INDUSTRY_WORLDS) {
    const model = createIndustryWorld(type);
    const camera = new THREE.PerspectiveCamera(model.camera.fov, 1, .1, 30);
    camera.position.set(...model.camera.position);
    camera.lookAt(...model.camera.target);
    camera.updateMatrixWorld(true);
    for (const aspect of [1.2, 1.45, 2.5, 4]) {
      frameIndustryCamera(camera, aspect);
      for (const [progress, accent] of [[WORLD_IDLE[type], 0], [.1, .1], [.35, .4], [.65, .7], [.85, .9], [1, 1]]) {
        model.update(progress, 0, { accent });
        model.object.updateMatrixWorld(true);
        model.object.traverseVisible(mesh => {
          if (!mesh.isMesh || mesh.geometry.drawRange.count === 0) return;
          const positions = mesh.geometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera);
            assert.ok(Math.abs(vertex.x) < 1 && Math.abs(vertex.y) < 1, `${type} clips at ${aspect}:1`);
          }
        });
      }
    }
    model.dispose();
  }
});
