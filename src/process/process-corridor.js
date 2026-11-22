import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createProcessCorridorModel } from './process-corridor-model.js';
import { createProcessStageDirector } from './process-stage-director.js';
import { selectProcessStage } from './process-stage-state.js';
import { gsap } from 'gsap';
import { graphicsProfile, createGraphicsMonitor, guardGraphics, watchGraphics } from '../motion/graphics-budget.js';

export function mountProcessCorridor(host, initialProgress = 0, initialStage = -1, fail) {
  let profile = graphicsProfile();
  const monitor = createGraphicsMonitor();
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: profile.antialias, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.dpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#06123c'); scene.fog = new THREE.Fog('#06123c', 6, 35);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04, .1, 100, { size: profile.environment });
  room.dispose(); pmrem.dispose(); scene.environment = environment.texture;
  const camera = new THREE.PerspectiveCamera(48, 1, .08, 80);
  camera.layers.enable(1);
  const model = createProcessCorridorModel({ simplified: profile.level === 'medium' }); scene.add(model.object);
  model.setStageDetailsVisible(false);
  const director = createProcessStageDirector(); scene.add(director.root);
  director.root.rotation.x = .24;
  const key = new THREE.DirectionalLight('#fff7e8', 1.2); key.position.set(-3, 4, 6);
  const fill = new THREE.DirectionalLight('#cadfff', .45); fill.position.set(3, 2, -4); scene.add(key, fill);
  // A separate lighting layer adds miniature contact shadows without changing
  // illumination, materials, or shadows on the original rings and floor.
  const productKey = new THREE.DirectionalLight('#fff7e8', 1.3); productKey.layers.set(1); productKey.castShadow = true;
  const shadowSize = profile.shadows;
  productKey.shadow.mapSize.set(shadowSize, shadowSize); productKey.shadow.camera.layers.set(1);
  Object.assign(productKey.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: .1, far: 10 });
  productKey.shadow.camera.updateProjectionMatrix();
  productKey.shadow.bias = -.0003; productKey.shadow.normalBias = .006;
  const productFill = new THREE.DirectionalLight('#cfdfed', .4); productFill.layers.set(1); productFill.position.set(2, 1, 3);
  scene.add(productKey, productKey.target, productFill);
  const dark = new THREE.Color('#06123c'), bright = new THREE.Color('#284864');
  let lastProgress = initialProgress, activeStage = -1, visible = true, ticking = false, previousTime = 0, disposed = false;
  let cameraProgress, sized = false;
  function positionCamera() {
    const progress = lastProgress;
    if (progress === cameraProgress) return;
    cameraProgress = progress;
    const state = model.update(progress);
    camera.position.set(Math.sin(progress * Math.PI * 2) * .07, .06, state.cameraZ);
    camera.lookAt(0, .02 + state.opening * .08, state.cameraZ - 5);
    scene.background.copy(dark).lerp(bright, state.opening * .8); scene.fog.color.copy(scene.background);
    scene.fog.far = 35 + state.opening * 20;
    renderer.toneMappingExposure = .95 + state.opening * .1;
    key.position.z = state.cameraZ + 3;
    // The miniature follows the viewing plane; only scrolling controls the camera.
    director.root.position.set(camera.position.x, -.07, state.cameraZ - 3.35);
    productKey.position.set(-1.5, 2.5, state.cameraZ - 1);
    productKey.target.position.set(0, -.2, state.cameraZ - 3.35);
    productKey.target.updateMatrixWorld();
  }
  function draw() {
    positionCamera();
    try {
      renderer.render(scene, camera);
      if (!renderer.getContext().isContextLost()) host.classList.add('has-process-corridor');
    } catch (error) { fail(error); }
  }
  function tick(time) {
    if (!sized || !visible || document.hidden || disposed) return;
    monitor.sample(performance.now());
    if (time - previousTime < 1 / profile.fps - .001) return;
    director.update(previousTime ? Math.min(time - previousTime, .06) : 0);
    previousTime = time; draw();
  }
  function setVisible(value) {
    visible = value;
    const needed = visible && !document.hidden && !disposed;
    if (needed === ticking) return;
    director.pause(!needed); previousTime = 0; monitor.reset();
    if (needed && !ticking) { gsap.ticker.add(tick); ticking = true; }
    if (!needed && ticking) { gsap.ticker.remove(tick); ticking = false; }
  }
  function render(progress = lastProgress, stage = selectProcessStage(progress, activeStage)) {
    lastProgress = progress; activeStage = stage; director.setStage(stage);
  }
  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    sized = Boolean(width && height);
    if (!sized) return;
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
    if (visible && !document.hidden) draw();
  }
  const unguard = guardGraphics(renderer, fail);
  const unwatch = watchGraphics(() => {
    profile = graphicsProfile();
    if (!profile.shadows) return;
    productKey.shadow.dispose();
    productKey.shadow.map = null;
    productKey.shadow.mapSize.setScalar(profile.shadows);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, profile.dpr));
  });
  host.append(renderer.domElement);
  const observer = new ResizeObserver(resize); observer.observe(host);
  render(initialProgress, initialStage < 0 ? selectProcessStage(initialProgress) : initialStage); setVisible(true);
  return {
    render,
    setVisible,
    dispose() { disposed = true; unguard(); unwatch(); setVisible(false); observer.disconnect(); director.dispose(); model.dispose(); productKey.dispose(); environment.dispose(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove(); host.classList.remove('has-process-corridor'); },
  };
}
