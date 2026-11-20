import * as THREE from 'three';
import { gsap } from 'gsap';
import { createProcessStageModel } from './process-stage-models.js';

// One miniature at a time; the old scene finishes fading before the next mounts.
export function createProcessStageDirector(factory = createProcessStageModel) {
  const root = new THREE.Group();
  let current = null, requested = -1, exiting = false, entrance = null, exit = null, paused = false, disposed = false;
  function release() {
    if (!current) return;
    root.remove(current.model.object); current.model.dispose(); current = null;
  }
  function mount(index) {
    if (disposed) return;
    const model = factory(index), surfaces = new Map();
    model.object.traverse(part => {
      part.layers.set(1);
      if (part.material) for (const material of [part.material].flat()) surfaces.set(material, {
        opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite,
      });
    });
    current = { index, model, surfaces, opacity: 0, reveal: 0, time: 0 };
    root.add(model.object);
    entrance = gsap.timeline({ paused });
    entrance.to(current, { opacity: 1, duration: .5, ease: 'power2.out' }, 0);
    entrance.to(current, { reveal: 1, duration: 1.7, ease: 'power2.inOut' }, .1);
  }
  return {
    root,
    get stage() { return current?.index ?? -1; },
    setStage(index) {
      if (disposed || index === requested) return;
      requested = index;
      if (!current) { mount(index); return; }
      if (current.index === index) {
        if (exiting) {
          exit?.kill(); exiting = false;
          entrance = gsap.timeline({ paused });
          entrance.to(current, { opacity: 1, duration: .3 }, 0);
          entrance.to(current, { reveal: 1, duration: Math.max(.2, (1 - current.reveal) * 1.7), ease: 'power2.out' }, 0);
        }
        return;
      }
      if (exiting) return; // Rapid scrolling updates only the pending destination.
      entrance?.kill(); exiting = true;
      exit = gsap.to(current, { opacity: 0, duration: .28, ease: 'power2.inOut', paused,
        onComplete: () => { release(); exiting = false; mount(requested); },
      });
    },
    update(delta) {
      if (!current || paused) return;
      current.time += delta;
      current.model.update(current.reveal, current.time);
      current.model.object.scale.setScalar(.88 + current.opacity * .12);
      current.model.object.position.z = -.25 * (1 - current.opacity);
      current.surfaces.forEach((base, material) => {
        material.opacity = base.opacity * current.opacity;
        material.transparent = base.transparent || current.opacity < .999;
        material.depthWrite = base.depthWrite && current.opacity > .95;
      });
    },
    pause(value) { paused = value; entrance?.paused(value); exit?.paused(value); },
    dispose() { disposed = true; entrance?.kill(); exit?.kill(); release(); root.clear(); },
  };
}
