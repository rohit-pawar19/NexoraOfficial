import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Industry-only environments. No Services models, choreography, or cameras are reused.
export const INDUSTRY_WORLDS = ['architecture', 'jewellery', 'storefront'];
export const WORLD_DURATIONS = { architecture: 5.2, jewellery: 4.4, storefront: 4.8 };

export function createIndustryWorld(type) {
  const world = new THREE.Group(), geometries = new Set(), materials = new Set(), textures = new Set();
  const gold = new THREE.MeshPhysicalMaterial({ color: '#d4af37', metalness: 1, roughness: .17, envMapIntensity: 1.25 });
  const stone = new THREE.MeshStandardMaterial({ color: '#d5d0c1', roughness: .78 });
  const navy = new THREE.MeshStandardMaterial({ color: '#14223a', metalness: .35, roughness: .35 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#8cabb8', metalness: .12, roughness: .075, transparent: true, opacity: .47, clearcoat: 1 });
  const warm = new THREE.MeshStandardMaterial({ color: '#e8c98d', roughness: .4, emissive: '#ffc06b', emissiveIntensity: 0 });
  [gold, stone, navy, glass, warm].forEach(item => materials.add(item));
  const phase = (p, start, duration) => THREE.MathUtils.smoothstep((p - start) / duration, 0, 1);
  const lerp = THREE.MathUtils.lerp;
  function mesh(geometry, material, parent = world, position = [0, 0, 0]) {
    geometries.add(geometry); materials.add(material);
    const object = new THREE.Mesh(geometry, material);
    // Glass transmits the showroom light instead of casting opaque black blocks.
    object.castShadow = !material.transparent && !(material.transmission > 0);
    object.receiveShadow = object.castShadow;
    object.position.set(...position); parent.add(object); return object;
  }
  function box(w, h, d, material, position, parent = world) {
    return mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(.02, w / 6, h / 6, d / 6)), material, parent, position);
  }
  function ring(r, thickness, parent, position) { return mesh(new THREE.TorusGeometry(r, thickness, 8, 32), gold, parent, position); }
  function curve(points, radius = .009, parent = world) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 6, false), gold, parent);
  }
  function reveal(group, progress, y = 0) { group.scale.y = Math.max(.001, progress); group.position.y = y - (1 - progress) * .25; }
  let update = () => {}, camera;

  if (type === 'architecture') {
    camera = { position: [3, 2.6, 4.2], target: [0, -.15, 0] };
    const grass = new THREE.MeshStandardMaterial({ color: '#385f47', roughness: .95 });
    const asphalt = new THREE.MeshStandardMaterial({ color: '#343c43', roughness: .92 });
    const water = new THREE.MeshPhysicalMaterial({ color: '#387c91', metalness: .15, roughness: .09, clearcoat: 1 });
    const plot = new THREE.Group(); world.add(plot);
    box(2.8, .12, 1.9, stone, [0, -.7, 0], plot);
    box(2.7, .025, 1.8, grass, [0, -.63, 0], plot);
    const roads = new THREE.Group(); world.add(roads);
    box(2.5, .016, .22, asphalt, [0, -.607, .51], roads);
    box(.2, .017, 1.55, asphalt, [-.98, -.607, 0], roads);
    for (let i = 0; i < 8; i++) box(.09, .003, .012, stone, [-.8 + i * .24, -.595, .51], roads);
    const towers = [];
    for (const [x, z, levels] of [[-.55, -.23, 5], [.19, -.38, 6], [.79, -.17, 4]]) {
      const tower = new THREE.Group(); tower.position.set(x, -.6, z); world.add(tower);
      const floors = [];
      for (let i = 0; i < levels; i++) {
        const floor = new THREE.Group(); tower.add(floor);
        box(.49, .035, .43, stone, [0, 0, 0], floor);
        if (i < levels - 1) {
          box(.43, .18, .37, glass, [0, .1, 0], floor);
          for (const side of [-1, 1]) box(.012, .19, .39, gold, [side * .19, .1, 0], floor);
          box(.28, .035, .012, warm, [0, .12, .19], floor);
        }
        floors.push(floor);
      }
      towers.push(floors);
    }
    const gardens = new THREE.Group(); world.add(gardens);
    for (const [x, z] of [[-1.2, -.58], [-1.2, .1], [-.7, .78], [.95, .74], [1.19, -.57]]) {
      box(.025, .16, .025, stone, [x, -.53, z], gardens);
      mesh(new THREE.IcosahedronGeometry(.12, 2), grass, gardens, [x, -.39, z]);
      box(.23, .017, .23, grass, [x, -.605, z], gardens);
    }
    const amenities = new THREE.Group(); world.add(amenities);
    box(.82, .025, .45, stone, [.2, -.6, .82], amenities);
    const pool = box(.68, .012, .32, water, [.2, -.58, .82], amenities);
    box(.5, .12, .3, navy, [-.5, -.55, .83], amenities);
    for (let i = 0; i < 3; i++) box(.045, .02, .15, gold, [.65 + i * .11, -.57, .81], amenities);
    update = (p, t) => {
      plot.scale.setScalar(Math.max(.001, phase(p, 0, .15)));
      roads.scale.x = Math.max(.001, phase(p, .1, .2));
      towers.forEach((floors, tower) => floors.forEach((floor, level) => {
        const built = phase(p, .22 + tower * .055 + level * .035, .23);
        floor.scale.y = Math.max(.001, built); floor.position.y = level * .205 * built;
      }));
      gardens.scale.setScalar(Math.max(.001, phase(p, .62, .2)));
      amenities.scale.setScalar(Math.max(.001, phase(p, .72, .18)));
      warm.emissiveIntensity = phase(p, .84, .16) * .42;
      pool.material.roughness = .09 + Math.sin(t * .4) * .01;
    };
  } else if (type === 'jewellery') {
    camera = { position: [2.5, 2.1, 4.2], target: [0, -.17, 0] };
    const marble = new THREE.MeshPhysicalMaterial({ color: '#e8dfd0', roughness: .24, metalness: .04 });
    const data = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const vein = Math.pow(Math.max(0, Math.sin(x * .07 + y * .11 + Math.sin(y * .08) * 2)), 22);
      const value = 236 - vein * 52; data.set([value, value - 5, value - 12, 255], (y * 128 + x) * 4);
    }
    const texture = new THREE.DataTexture(data, 128, 128); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
    marble.map = texture; textures.add(texture);
    const floor = new THREE.Group(); world.add(floor);
    box(2.65, .08, 1.8, marble, [0, -.69, 0], floor);
    for (const x of [-.85, 0, .85]) box(.007, .003, 1.72, gold, [x, -.647, 0], floor);
    const backdrop = new THREE.Group(); world.add(backdrop);
    box(2.5, 1.2, .06, navy, [0, -.06, -.79], backdrop);
    box(.055, 1.2, .065, gold, [-1.2, -.06, -.75], backdrop);
    box(.055, 1.2, .065, gold, [1.2, -.06, -.75], backdrop);
    const counters = [], frames = [], collections = [];
    const velvet = new THREE.MeshStandardMaterial({ color: '#0d1525', roughness: .94 });
    const crystal = new THREE.MeshPhysicalMaterial({ color: '#e0f0ee', roughness: .035, metalness: 0, transmission: .88,
      thickness: .045, ior: 2.2, dispersion: .04 });
    for (const [index, [x, z, width]] of [[-.78, -.18, .62], [.76, -.18, .62], [0, .45, .82]].entries()) {
      const counter = new THREE.Group(); counter.position.set(x, 0, z); world.add(counter);
      box(width, .32, .4, navy, [0, -.46, 0], counter);
      box(width - .04, .018, .36, velvet, [0, -.285, 0], counter);
      box(width, .21, .4, glass, [0, -.17, 0], counter);
      const frame = new THREE.Group(); counter.add(frame); frames.push(frame);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(.012, .23, .012, gold, [sx * (width / 2 - .012), -.17, sz * .19], frame);
      for (const sz of [-1, 1]) box(width, .012, .012, gold, [0, -.055, sz * .19], frame);
      const collection = new THREE.Group(); collection.position.y = -.25; counter.add(collection); collections.push(collection);
      if (index === 0) {
        // Two pendant earrings in their own velvet tray, not a product-ring model.
        for (const sx of [-1, 1]) {
          ring(.037, .008, collection, [sx * .1, .08, .04]);
          mesh(new THREE.OctahedronGeometry(.035), crystal, collection, [sx * .1, .015, .04]);
        }
      } else if (index === 1) {
        const bust = mesh(new THREE.SphereGeometry(.09, 20, 12), velvet, collection, [0, .055, 0]); bust.scale.set(1, 1.3, .5);
        const necklace = ring(.07, .006, collection, [0, .055, .048]); necklace.scale.y = 1.2;
        mesh(new THREE.OctahedronGeometry(.024), crystal, collection, [0, -.02, .05]);
      } else {
        for (let j = 0; j < 3; j++) {
          const bracelet = ring(.055, .008, collection, [-.21 + j * .21, .025, 0]); bracelet.rotation.x = -1;
          mesh(new THREE.OctahedronGeometry(.018), crystal, collection, [-.21 + j * .21, .07, .02]);
        }
      }
      counters.push(counter);
    }
    const spotlights = [];
    for (const x of [-.8, .8]) {
      const spot = new THREE.SpotLight('#ffe4b4', 0, 4, .45, .8, 1.5); spot.position.set(x, 1.25, .65);
      spot.target.position.set(x * .7, -.3, 0); world.add(spot, spot.target); spotlights.push(spot);
      box(.09, .04, .1, gold, [x, .55, -.67]);
    }
    update = (p, t) => {
      floor.scale.setScalar(Math.max(.001, phase(p, 0, .15)));
      reveal(backdrop, phase(p, .1, .3));
      counters.forEach((counter, i) => { counter.position.y = -.35 * (1 - phase(p, .18 + i * .05, .28)); counter.scale.y = Math.max(.001, phase(p, .18 + i * .05, .28)); });
      frames.forEach((frame, i) => { frame.scale.y = Math.max(.001, phase(p, .38 + i * .04, .25)); });
      collections.forEach((collection, i) => { collection.scale.setScalar(Math.max(.001, phase(p, .58 + i * .04, .22))); });
      spotlights.forEach((spot, i) => { spot.intensity = phase(p, .78, .22) * (2 + Math.sin(t * .2 + i) * .06); });
    };
  } else if (type === 'storefront') {
    camera = { position: [.5, 2.5, 4.6], target: [0, -.15, 0] };
    box(2.7, .08, 1.85, navy, [0, -.68, 0]);
    const locations = [], positions = [[-.7, .28], [.65, .35], [-.65, -.53], [.65, -.5]];
    const signs = [];
    positions.forEach(([x, z], index) => {
      const business = new THREE.Group(); business.position.set(x, 0, z); world.add(business);
      const height = index === 3 ? 1.05 : .55;
      box(.65, height, .46, index === 3 ? stone : navy, [0, -.64 + height / 2, 0], business);
      box(.55, height - .14, .015, glass, [0, -.62 + height / 2, .24], business);
      box(.018, height - .12, .025, gold, [.08, -.62 + height / 2, .25], business);
      const sign = box(.65, .1, .06, warm, [0, -.6 + height, .25], business); signs.push(sign);
      if (index < 3) {
        for (let stripe = 0; stripe < 5; stripe++) box(.13, .025, .19, stripe % 2 ? navy : gold, [-.26 + stripe * .13, -.72 + height, .3], business);
      } else {
        for (let level = 1; level < 5; level++) box(.59, .018, .035, gold, [0, -.63 + level * .2, .25], business);
      }
      locations.push(business);
    });
    const connections = [[0, 1], [0, 2], [1, 3], [2, 3]].map(([a, b]) => {
      const [x1, z1] = positions[a], [x2, z2] = positions[b];
      return curve([[x1, -.61, z1], [(x1 + x2) / 2, -.5, (z1 + z2) / 2], [x2, -.61, z2]]);
    });
    const growth = curve([[-.9, -.22, -.78], [-.3, .02, -.78], [.25, .26, -.78], [.8, .65, -.78]], .012);
    const tip = mesh(new THREE.ConeGeometry(.045, .12, 12), gold, world, [.8, .65, -.78]); tip.rotation.z = -.8;
    update = (p, t) => {
      locations.forEach((location, i) => { const built = phase(p, i * .14, .3); location.scale.y = Math.max(.001, built); location.position.y = -.64 * (1 - built); });
      connections.forEach((link, i) => { link.geometry.setDrawRange(0, Math.floor(link.geometry.index.count * phase(p, .54 + i * .04, .25) / 3) * 3); });
      growth.geometry.setDrawRange(0, Math.floor(growth.geometry.index.count * phase(p, .78, .22) / 3) * 3);
      tip.scale.setScalar(Math.max(.001, phase(p, .92, .08)));
      warm.emissiveIntensity = phase(p, .6, .3) * .23;
      world.rotation.y = Math.sin(t * .13) * .11 * phase(p, .85, .15);
    };
  } else { throw new Error(`Unknown industry world: ${type}`); }
  let disposed = false;
  return {
    object: world, camera,
    update(progress, time = 0) { update(THREE.MathUtils.clamp(progress, 0, 1), time); },
    dispose() { if (disposed) return; disposed = true; geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose()); world.clear(); },
  };
}
