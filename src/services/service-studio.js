import * as THREE from 'three';
import { gsap } from 'gsap';
import { createServiceModel } from './service-models.js';
import { useConstrainedGraphics } from '../motion/graphics-budget.js';

// One offscreen WebGL context, shared between small local 2D presentation canvases.
// Only the active card renders at 30 fps. Exiting cards retain a frozen frame.
export function createServiceStudio() {
  const constrained = useConstrainedGraphics();
  const renderWidth = constrained ? 384 : 480;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !constrained, powerPreference: 'low-power' });
  renderer.setPixelRatio(1); renderer.setSize(renderWidth, renderWidth * .75);
  renderer.setClearColor('#06123c', 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .98;
  renderer.transmissionResolutionScale = .5;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene(); room.background = new THREE.Color().setRGB(.24, .23, .21);
  const panels = [];
  for (const [w, h, position, intensity, color] of [
    [5, 7, [-4, 3, 5], 3, '#ffffff'], [6, 5, [4, 0, 3], 1.15, '#fff1d5'],
    [8, 6, [0, -4, 3], .65, '#ffffff'], [.5, 7, [3, 2, -4], 3, '#ffffff'],
    [5, 4, [0, 5, -2], 2, '#ffffff'], [7, 6, [0, 0, -6], .65, '#fff4e0'],
  ]) {
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }); material.color.multiplyScalar(intensity);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); panel.position.set(...position); panel.lookAt(0, 0, 0);
    room.add(panel); panels.push(panel);
  }
  const environment = pmrem.fromScene(room, .035, .1, 100, { size: constrained ? 128 : 256 });
  panels.forEach(panel => { panel.geometry.dispose(); panel.material.dispose(); }); pmrem.dispose();
  const entries = new Set();
  let listening = false, disposed = false;
  function schedule() {
    const needed = !document.hidden && [...entries].some(entry => entry.visible);
    if (needed && !listening) { gsap.ticker.add(tick); listening = true; }
    if (!needed && listening) { gsap.ticker.remove(tick); listening = false; }
  }
  function tick(time) {
    for (const entry of entries) {
      if (!entry.visible || document.hidden) continue;
      const interval = 1 / 30;
      if (time - entry.last < interval) continue;
      entry.time += Math.min(time - (entry.last || time), .15); entry.last = time;
      const width = entry.host.clientWidth, height = entry.host.clientHeight;
      if (!width || !height) continue;
      const scale = Math.min(devicePixelRatio || 1, constrained ? 1 : 1.5);
      const outputWidth = Math.min(renderWidth, Math.round(width * scale));
      const outputHeight = Math.round(outputWidth * height / width);
      if (entry.canvas.width !== outputWidth || entry.canvas.height !== outputHeight) {
        entry.canvas.width = outputWidth; entry.canvas.height = outputHeight;
      }
      const aspect = width / height;
      if (entry.camera.aspect !== aspect) {
        entry.camera.aspect = aspect;
        entry.camera.updateProjectionMatrix();
      }
      entry.model.update(entry.time, entry.motion.hover, entry.motion.assembly, entry.motion.pointer, entry.motion.reveal);
      if (entry.type === 'building') {
        const orbit = Math.sin(entry.time * .2) * .12 * entry.motion.assembly;
        entry.camera.position.set(Math.sin(orbit) * 3.9, .35, Math.cos(orbit) * 3.9);
        entry.camera.lookAt(0, 0, 0);
      }
      entry.key.position.x = -2.5 + entry.motion.pointer.x * .35;
      entry.scene.environmentRotation.y = entry.motion.pointer.x * .08 * entry.motion.hover + Math.sin(entry.time * .3) * .055;
      renderer.render(entry.scene, entry.camera);
      entry.context.clearRect(0, 0, outputWidth, outputHeight);
      entry.context.drawImage(renderer.domElement, 0, 0, outputWidth, outputHeight);
      entry.host.classList.add('has-studio-model');
    }
  }
  const visibility = () => { entries.forEach(entry => { entry.last = 0; }); schedule(); };
  document.addEventListener('visibilitychange', visibility);
  return {
    add(host, type, motion) {
      if (disposed) return null;
      entries.forEach(entry => { entry.visible = false; });
      const canvas = document.createElement('canvas'); canvas.className = 'service-studio-canvas'; canvas.setAttribute('aria-hidden', 'true');
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) return null;
      const scene = new THREE.Scene(); scene.environment = environment.texture;
      const camera = new THREE.PerspectiveCamera(34, 4 / 3, .1, 20);
      camera.position.set(0, .18, 3.9); camera.lookAt(0, 0, 0);
      const model = createServiceModel(type); scene.add(model.object);
      const key = new THREE.DirectionalLight('#fff8eb', 1.1); key.position.set(-2.5, 3, 4);
      const fill = new THREE.DirectionalLight('#c9ddff', .45); fill.position.set(3, 1, 2);
      const rim = new THREE.DirectionalLight('#fff1d5', .85); rim.position.set(2, 2, -3);
      scene.add(key, fill, rim);
      host.append(canvas);
      const entry = { host, canvas, context, scene, camera, key, model, motion, type, visible: true, last: 0, time: 0 };
      entries.add(entry); schedule();
      return {
        visible(value) { entry.visible = value; entry.last = 0; schedule(); },
        dispose() {
          if (!entries.has(entry)) return;
          entries.delete(entry); model.dispose(); canvas.remove(); host.classList.remove('has-studio-model'); schedule();
        },
      };
    },
    dispose() {
      disposed = true; gsap.ticker.remove(tick); listening = false;
      document.removeEventListener('visibilitychange', visibility);
      entries.forEach(entry => { entry.model.dispose(); entry.canvas.remove(); entry.host.classList.remove('has-studio-model'); });
      entries.clear(); environment.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
