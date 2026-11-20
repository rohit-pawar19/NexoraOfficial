import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';

// Instantiated only for the active jewellery card; all GPU resources are released
// on blur/leave, viewport exit, reduced motion, or document visibility changes.
export function mountServiceGem(host) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch { return () => {}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(160, 130);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 160 / 130, .1, 20);
  camera.position.set(0, .15, 3.7);
  camera.lookAt(0, 0, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .025);
  scene.environment = environment.texture;
  room.dispose(); pmrem.dispose();
  const geometry = new THREE.LatheGeometry([
    new THREE.Vector2(0, -.65), new THREE.Vector2(.58, .15),
    new THREE.Vector2(.59, .21), new THREE.Vector2(.3, .48),
    new THREE.Vector2(0, .48),
  ], 8);
  const material = new THREE.MeshPhysicalMaterial({
    color: '#fff3d0', metalness: 0, roughness: .035, transmission: .96,
    thickness: .8, ior: 2.42, dispersion: .055,
    envMapIntensity: 1.35, flatShading: true,
  });
  const gem = new THREE.Mesh(geometry, material);
  gem.rotation.set(.2, .1, .12);
  scene.add(gem);
  host.append(renderer.domElement);
  host.classList.add('has-optical-model');
  const tick = (_time, delta) => {
    gem.rotation.y += Math.min(delta / 1000, .05) * .55;
    renderer.render(scene, camera);
  };
  renderer.render(scene, camera);
  gsap.ticker.add(tick);
  return () => {
    gsap.ticker.remove(tick);
    geometry.dispose(); material.dispose(); environment.dispose();
    renderer.dispose(); renderer.forceContextLoss();
    renderer.domElement.remove();
    host.classList.remove('has-optical-model');
  };
}
