import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createServiceModel, SERVICE_TYPES } from '../src/services/service-models.js';

for (const type of SERVICE_TYPES) {
  test(`${type}: idle/assembly/interaction stay finite, framed, and within the geometry budget`, () => {
    const model = createServiceModel(type);
    let vertices = 0;
    model.object.traverse(object => {
      if (!object.isMesh) return;
      vertices += object.geometry.getAttribute('position').count;
      for (const value of object.geometry.getAttribute('position').array) assert.ok(Number.isFinite(value));
      for (const material of [object.material].flat()) {
        if (material.isMeshStandardMaterial) {
          assert.ok(material.roughness >= 0 && material.roughness <= 1);
          assert.ok(material.metalness >= 0 && material.metalness <= 1);
        }
      }
    });
    assert.ok(vertices < 100_000, `${type}: ${vertices} vertices exceed the small-product budget`);
    for (const time of [0, 3.2, 18, 120]) {
      for (const hover of [0, .5, 1]) {
        for (const assembly of [0, .5, 1]) {
          model.update(time, hover, assembly, { x: .8, y: -.8 });
          model.object.updateMatrixWorld(true);
          const bounds = new THREE.Box3().setFromObject(model.object);
          for (const value of [...bounds.min.toArray(), ...bounds.max.toArray()]) assert.ok(Number.isFinite(value));
          assert.ok(bounds.getSize(new THREE.Vector3()).length() < 5, 'model leaves the product framing envelope');
        }
      }
    }
    model.dispose();
  });
}

test('each model disposes all its geometries, materials and procedural textures', () => {
  for (const type of SERVICE_TYPES) {
    const model = createServiceModel(type);
    const resources = new Set();
    model.object.traverse(object => {
      if (!object.isMesh) return;
      resources.add(object.geometry);
      for (const material of [object.material].flat()) {
        resources.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
      }
    });
    const disposed = new Set();
    resources.forEach(resource => resource.addEventListener('dispose', () => disposed.add(resource)));
    model.dispose();
    assert.equal(disposed.size, resources.size, `${type} leaks a model resource`);
  }
});
