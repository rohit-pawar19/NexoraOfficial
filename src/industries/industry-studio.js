import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createIndustryWorld } from './industry-models.js';
import { useConstrainedGraphics } from '../motion/graphics-budget.js';

// One GPU context serves all three card-local canvases. Hidden worlds don't tick.
export function createIndustryStudio() {
  const constrained = useConstrainedGraphics();
  const renderWidth = constrained ? 384 : 480;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !constrained, powerPreference: 'low-power' });
  renderer.setPixelRatio(1); renderer.setSize(renderWidth, renderWidth / 2); renderer.setClearColor('#06123c', 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.transmissionResolutionScale = .5;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .035, .1, 100, { size: constrained ? 128 : 256 });
  room.dispose(); pmrem.dispose();
  const entries = new Set(); let ticking = false;
  function schedule() {
    const needed = !document.hidden && [...entries].some(entry => entry.state.visible && entry.state.active);
    if (needed && !ticking) { ticking = true; gsap.ticker.add(tick); }
    if (!needed && ticking) { ticking = false; gsap.ticker.remove(tick); }
  }
  function tick(time) {
    entries.forEach(entry => {
      const { state, host, canvas, context, model, camera, scene } = entry;
      if (!state.visible || !state.active || document.hidden) return;
      if (time - entry.last < 1 / 30) return;
      entry.time += Math.min(time - (entry.last || time), .12); entry.last = time;
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      const targetWidth = Math.min(renderWidth, Math.round(width * Math.min(window.devicePixelRatio || 1, constrained ? 1 : 1.5)));
      const targetHeight = Math.round(targetWidth * height / width);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) { canvas.width = targetWidth; canvas.height = targetHeight; }
      const aspect = width / height;
      if (camera.aspect !== aspect) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
      model.update(state.progress, entry.time, state.pointer);
      if (state.type === 'jewellery') {
        const orbit = .48 + Math.sin(entry.time * .11) * .1 * state.progress;
        camera.position.set(Math.sin(orbit) * 4.8, 2.1, Math.cos(orbit) * 4.8);
        camera.lookAt(...model.camera.target);
        entry.key.position.x = -2.5 + state.pointer.x * .35;
        scene.environmentRotation.y = state.pointer.x * .08 + Math.sin(entry.time * .2) * .035;
      } else if (state.type === 'architecture') {
        const orbit = .62 + Math.sin(entry.time * .08) * .13 * state.progress;
        camera.position.set(Math.sin(orbit) * 5.15, 2.6, Math.cos(orbit) * 5.15);
        camera.lookAt(...model.camera.target);
      }
      renderer.render(scene, camera);
      context.clearRect(0, 0, targetWidth, targetHeight);
      context.drawImage(renderer.domElement, 0, 0, targetWidth, targetHeight);
      host.classList.add('has-industry-world');
    });
    schedule();
  }
  const visibility = () => { entries.forEach(entry => { entry.last = 0; }); schedule(); };
  document.addEventListener('visibilitychange', visibility);
  return {
    add(host, state) {
      const canvas = document.createElement('canvas'); canvas.className = 'industry-world-canvas'; canvas.setAttribute('aria-hidden', 'true');
      const context = canvas.getContext('2d', { alpha: true }); if (!context) return null;
      const model = createIndustryWorld(state.type), scene = new THREE.Scene(); scene.environment = environment.texture;
      scene.add(model.object);
      const camera = new THREE.PerspectiveCamera(34, 2, .1, 30); camera.position.set(...model.camera.position); camera.lookAt(...model.camera.target);
      const key = new THREE.DirectionalLight('#fff7e7', state.type === 'jewellery' ? .9 : 1.25); key.position.set(-2.5, 4, 4);
      // Only the currently active miniature renders, with one soft key shadow.
      const shadowSize = constrained ? 512 : 1024;
      key.castShadow = true; key.shadow.mapSize.set(shadowSize, shadowSize);
      Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: .1, far: 12 });
      key.shadow.bias = -.00025; key.shadow.normalBias = .008;
      const fill = new THREE.DirectionalLight('#c9ddff', state.type === 'architecture' ? .6 : .35); fill.position.set(3, 1, 2);
      const rim = new THREE.DirectionalLight('#ffe4b1', .8); rim.position.set(2, 2, -3); scene.add(key, fill, rim);
      host.append(canvas);
      const entry = { host, state, canvas, context, model, scene, camera, key, last: 0, time: 0 }; entries.add(entry); schedule();
      return {
        sync() { if (!state.visible || !state.active) entry.last = 0; schedule(); },
        dispose() {
          if (!entries.delete(entry)) return;
          model.dispose(); key.dispose(); canvas.remove(); host.classList.remove('has-industry-world'); schedule();
        },
      };
    },
    dispose() {
      gsap.ticker.remove(tick); document.removeEventListener('visibilitychange', visibility);
      entries.forEach(entry => { entry.model.dispose(); entry.key.dispose(); entry.canvas.remove(); entry.host.classList.remove('has-industry-world'); });
      entries.clear(); environment.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
