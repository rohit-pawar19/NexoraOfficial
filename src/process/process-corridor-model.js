import * as THREE from 'three';

export const PROCESS_STAGE_COUNT = 8;
export function journeyPosition(progress) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  return { progress: p, stage: Math.min(7, Math.floor(p * 7 + .5)), cameraZ: 4.5 - p * 36.4,
    opening: THREE.MathUtils.smoothstep(p, .87, 1) };
}

export function createProcessCorridorModel() {
  const object = new THREE.Group(), geometries = new Set(), materials = new Set();
  const gold = new THREE.MeshPhysicalMaterial({ color: '#d4af37', metalness: 1, roughness: .16, envMapIntensity: 1.3 });
  const navy = new THREE.MeshStandardMaterial({ color: '#102443', metalness: .45, roughness: .38 });
  const light = new THREE.MeshStandardMaterial({ color: '#e9d7a7', metalness: .5, roughness: .3, emissive: '#b8860b', emissiveIntensity: .08 });
  [gold, navy, light].forEach(material => materials.add(material));
  function mesh(geometry, material, parent = object) {
    geometries.add(geometry); materials.add(material);
    const part = new THREE.Mesh(geometry, material); parent.add(part); return part;
  }
  function box(w, h, d, position, material = gold, parent = object) {
    const part = mesh(new THREE.BoxGeometry(w, h, d), material, parent); part.position.set(...position); return part;
  }
  const frames = [], details = [];
  const ringGeometry = new THREE.TorusGeometry(1.72, .045, 12, 80);
  for (let i = 0; i < PROCESS_STAGE_COUNT; i++) {
    const station = new THREE.Group(); station.position.z = -i * 5.2; object.add(station);
    const material = gold.clone(); materials.add(material);
    const frame = mesh(ringGeometry, material, station);
    const detail = new THREE.Group(); detail.position.set(i % 2 ? 2.03 : -2.03, -.15, -.15); station.add(detail);
    frames.push(frame); details.push(detail);
  }
  box(4.9, .08, 49, [0, -1.8, -18], navy);
  for (const x of [-1.6, 1.6]) box(.012, .012, 49, [x, -1.75, -18], light);
  function repeatBox(width, height, depth, material, positions) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometries.add(geometry);
    const instances = new THREE.InstancedMesh(geometry, material, positions.length);
    const matrix = new THREE.Matrix4();
    positions.forEach((position, index) => instances.setMatrixAt(index, matrix.makeTranslation(...position)));
    object.add(instances);
    return instances;
  }
  const floorLines = repeatBox(4.4, .007, .012, light,
    Array.from({ length: 16 }, (_, i) => [0, -1.748, 4 - i * 3]));
  const posts = repeatBox(.07, 4.1, .07, navy,
    [-2.4, 2.4].flatMap(x => Array.from({ length: 8 }, (_, i) => [x, .1, -i * 5.2])));

  // Understand: the wireframe is constructed edge by edge.
  const wireGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(.55, .55, .55)); geometries.add(wireGeometry);
  const wireMaterial = new THREE.LineBasicMaterial({ color: '#e4c773' }); materials.add(wireMaterial);
  const wire = new THREE.LineSegments(wireGeometry, wireMaterial); details[0].add(wire);
  // Plan: three diagram planes align to a common axis.
  const plans = Array.from({ length: 3 }, (_, i) => box(.5, .025, .4, [0, (i - 1) * .19, 0], i === 1 ? gold : navy, details[1]));
  // Create: bevelled facets meet as a coherent sculptural composition.
  const facets = Array.from({ length: 3 }, (_, i) => {
    const part = mesh(new THREE.OctahedronGeometry(.18), i === 1 ? light : gold, details[2]); part.position.y = (i - 1) * .25; return part;
  });
  // Build: structural layers stack in depth, without rotating the entire object.
  const structure = Array.from({ length: 4 }, (_, i) => box(.55, .07, .42, [0, (i - 1.5) * .18, 0], i % 2 ? navy : gold, details[3]));
  // Produce: aligned material sheets emerge from a compact production stack.
  const sheets = Array.from({ length: 4 }, (_, i) => box(.48, .035, .54, [0, (i - 1.5) * .1, 0], i === 3 ? gold : light, details[4]));
  // Promote: connected channels draw out from a central campaign hub.
  const network = new THREE.Group(); details[5].add(network);
  const links = [], nodes = [];
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    const node = mesh(new THREE.SphereGeometry(.055, 12, 8), gold, network); node.position.set(Math.cos(angle) * .3, Math.sin(angle) * .3, 0); nodes.push(node);
    const link = box(.3, .008, .008, [Math.cos(angle) * .15, Math.sin(angle) * .15, 0], light, network); link.rotation.z = angle; links.push(link);
  }
  mesh(new THREE.SphereGeometry(.075, 16, 10), light, network);
  // Execute: a precise route lights up as the installation is completed.
  const route = Array.from({ length: 5 }, (_, i) => box(.4, .035, .08, [0, -.4 + i * .16, 0], gold, details[6]));
  // Grow: the final frame opens into wider architecture and new connections.
  const wings = [-1, 1].map(sign => box(.045, 3.8, .14, [sign * 1.6, 0, -37.3], gold));
  const growth = Array.from({ length: 3 }, (_, i) => box(.09, .25 + i * .18, .09, [(i - 1) * .2, -.3, 0], light, details[7]));
  const horizon = mesh(new THREE.TorusGeometry(3.2, .06, 12, 96), gold); horizon.position.z = -43;
  let disposed = false, detailsVisible = true;
  return {
    object,
    setStageDetailsVisible(visible) {
      detailsVisible = visible;
      details.forEach(detail => { detail.visible = visible; });
    },
    update(progress) {
      const state = journeyPosition(progress), position = state.progress * 7;
      const activation = i => 1 - THREE.MathUtils.smoothstep(Math.abs(position - i), .05, 1.15);
      frames.forEach((frame, i) => {
        frame.material.roughness = .25 - activation(i) * .1;
        frame.material.envMapIntensity = .8 + activation(i) * .65;
      });
      if (detailsVisible) {
        wireGeometry.setDrawRange(0, Math.max(2, Math.floor(wireGeometry.attributes.position.count * (.2 + activation(0) * .8) / 2) * 2));
        plans.forEach((part, i) => { part.position.x = (1 - activation(1)) * (i - 1) * .25; part.rotation.z = (1 - activation(1)) * (i - 1) * .2; });
        facets.forEach((part, i) => { part.position.x = (1 - activation(2)) * Math.cos(i * 2.1) * .35; part.rotation.y = activation(2) * .6; });
        structure.forEach((part, i) => { part.position.z = (1 - activation(3)) * i * .16; });
        sheets.forEach((part, i) => { part.position.x = (1 - activation(4)) * i * .12; part.rotation.z = (1 - activation(4)) * i * .08; });
        links.forEach((part, i) => { part.scale.x = .15 + activation(5) * .85; nodes[i].scale.setScalar(.5 + activation(5) * .5); });
        route.forEach((part, i) => { part.scale.x = .1 + THREE.MathUtils.smoothstep(activation(6), i * .12, .5 + i * .12) * .9; });
        growth.forEach((part, i) => { part.scale.y = 1 + state.opening * (i + 1) * .35; });
      }
      wings.forEach((wing, i) => { wing.position.x = (i ? 1 : -1) * (1.6 + state.opening * 1.35); });
      frames[7].scale.setScalar(1 + state.opening * .32);
      return state;
    },
    dispose() { if (disposed) return; disposed = true; floorLines.dispose(); posts.dispose(); geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); object.clear(); },
  };
}
