import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createIndustryWorld, frameIndustryCamera } from './industry-models.js';
import { graphicsProfile, createGraphicsMonitor, guardGraphics } from '../motion/graphics-budget.js';

// Each card retains a still on its own 2D canvas. Only invalidated views use the shared GPU.
export function createIndustryStudio(fail) {
  const initial = graphicsProfile();
  const monitor = createGraphicsMonitor();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: initial.antialias, powerPreference: 'default' });
  renderer.setPixelRatio(1);
  renderer.setClearColor('#06123c', 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .99;
  renderer.transmissionResolutionScale = .65;
  renderer.shadowMap.enabled = Boolean(initial.shadows);
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .028, .1, 100, { size: initial.environment });
  room.dispose();
  pmrem.dispose();
  const entries = new Set();
  const pending = new Set();
  let frame = 0, lastFrame = -Infinity;
  const unguard = guardGraphics(renderer, fail);
  const byHost = new Map();
  const resize = new ResizeObserver(entries => {
    for (const { target, contentRect } of entries) {
      const entry = byHost.get(target);
      if (!entry) continue;
      entry.width = contentRect.width;
      entry.height = contentRect.height;
      entry.product.sync();
    }
  });

  function schedule() {
    if (!frame && pending.size && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = 0;
    if (document.hidden) return;
    monitor.sample(now);
    const profile = graphicsProfile();
    if (now - lastFrame < 1000 / profile.fps - 1) {
      schedule();
      return;
    }
    lastFrame = now;
    // Spread initial previews and resize redraws across frames.
    const entry = pending.values().next().value;
    if (entry) {
      pending.delete(entry);
      const { host, state, canvas, context, model, scene, camera, key, sweep } = entry;
      if (!state.visible || !entry.width || !entry.height) {
        schedule();
        return;
      }
      const aspect = entry.width / entry.height;
      const width = Math.max(1, Math.min(profile.cardWidth, Math.round(entry.width * Math.min(devicePixelRatio || 1, profile.dpr))));
      const height = Math.max(1, Math.round(width / aspect));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
        renderer.setSize(width, height, false);
      }
      if (camera.aspect !== aspect) frameIndustryCamera(camera, aspect);
      model.update(state.progress, 0, { accent: state.accent });
      const position = state.accent;
      const hit = Math.max(0, Math.sin(Math.PI * THREE.MathUtils.smoothstep(position,
        state.type === 'jewellery' ? .12 : .66, 1)));
      key.position.x = -3 + position * 3.3;
      sweep.position.x = -2.5 + 5 * position;
      sweep.intensity = hit * (state.type === 'jewellery' ? 2.1 : 2.6);
      scene.environmentRotation.y = state.accent * .32;
      renderer.transmissionResolutionScale = profile.transmission;
      renderer.shadowMap.enabled = Boolean(profile.shadows);
      if (key.shadow.mapSize.x !== profile.shadows && profile.shadows) {
        key.shadow.dispose();
        key.shadow.map = null;
        key.shadow.mapSize.setScalar(profile.shadows);
      }
      try {
        renderer.render(scene, camera);
        if (renderer.getContext().isContextLost()) return;
        context.clearRect(0, 0, width, height);
        context.drawImage(renderer.domElement, 0, 0, width, height);
      } catch (error) { fail(error); return; }
      if (!entry.ready) {
        entry.ready = true;
        host.classList.add('has-industry-world');
      }
    }
    schedule();
  }

  document.addEventListener('visibilitychange', schedule);
  return {
    add(host, state) {
      const canvas = document.createElement('canvas');
      canvas.className = 'industry-world-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) return null;
      const model = createIndustryWorld(state.type);
      const scene = new THREE.Scene();
      scene.environment = environment.texture;
      scene.add(model.object);
      const camera = new THREE.PerspectiveCamera(model.camera.fov, 1, .1, 30);
      frameIndustryCamera(camera, 1);
      camera.position.set(...model.camera.position);
      camera.lookAt(...model.camera.target);
      const key = new THREE.DirectionalLight('#fff4df', 1.6);
      key.position.set(-3, 4, 4);
      key.castShadow = Boolean(initial.shadows);
      key.shadow.mapSize.setScalar(initial.shadows);
      Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: .1, far: 12 });
      key.shadow.bias = -.0002;
      key.shadow.normalBias = .008;
      const fill = new THREE.DirectionalLight('#c4dcff', .68);
      fill.position.set(3, 1, 2);
      const rim = new THREE.DirectionalLight('#ffe0aa', 1.05);
      rim.position.set(2, 2, -3);
      const sweep = new THREE.PointLight('#ffce83', 0, 6, 2);
      sweep.position.set(-2.5, 1.1, 1.45);
      scene.add(key, fill, rim, sweep);
      host.append(canvas);
      const entry = { host, state, canvas, context, model, scene, camera, key, sweep };
      entries.add(entry);
      const product = {
        sync() {
          if (state.visible) pending.add(entry);
          else pending.delete(entry);
          schedule();
        },
        dispose() {
          if (!entries.delete(entry)) return;
          pending.delete(entry);
          if (!pending.size) monitor.reset();
          byHost.delete(host);
          resize.unobserve(host);
          model.dispose();
          key.dispose();
          canvas.remove();
          host.classList.remove('has-industry-world');
        },
      };
      entry.product = product;
      byHost.set(host, entry);
      resize.observe(host);
      return product;
    },
    dispose() {
      unguard();
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      for (const entry of entries) entry.product.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
