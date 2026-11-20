import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Small product models refine the same eight concepts used by the CSS versions.
// No downloaded assets, screen textures, postprocessing, or shadow-map passes.
export const SERVICE_TYPES = ['brand', 'lens', 'building', 'gem', 'paper', 'network', 'browser', 'stage'];

export function createServiceModel(type) {
  const root = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({ color: '#D4AF37', metalness: 1, roughness: .19, envMapIntensity: 1.3 });
  const navy = new THREE.MeshStandardMaterial({ color: '#122039', metalness: .55, roughness: .31 });
  const ivory = new THREE.MeshStandardMaterial({ color: '#eee7d5', metalness: 0, roughness: .72 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#7395ac', metalness: .18, roughness: .09,
    transparent: true, opacity: .66, clearcoat: 1, clearcoatRoughness: .08 });
  const geometries = new Set(), materials = new Set([gold, navy, ivory, glass]), textures = new Set();
  function mesh(geometry, material, parent = root, position = [0, 0, 0]) {
    geometries.add(geometry); materials.add(material);
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position); parent.add(item); return item;
  }
  function box(w, h, d, material, parent = root, position = [0, 0, 0], bevel = .025) {
    return mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(bevel, w / 5, h / 5, d / 5)), material, parent, position);
  }
  function cylinder(radius, depth, material, position, parent = root) {
    const item = mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material, parent, position);
    item.rotation.x = Math.PI / 2; return item;
  }
  function ring(radius, tube, material = gold, position = [0, 0, 0], parent = root) {
    return mesh(new THREE.TorusGeometry(radius, tube, 8, 48), material, parent, position);
  }
  function strut(a, b, radius = .012, material = gold, parent = root) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const item = mesh(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 8), material, parent);
    item.position.copy(start).add(end).multiplyScalar(.5);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return item;
  }
  function grain(material, strength, base) {
    const data = new Uint8Array(64 * 64 * 4);
    let seed = 17;
    for (let i = 0; i < data.length; i += 4) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const value = base + ((seed / 4294967296) - .5) * strength;
      data.set([value, value, value, 255], i);
    }
    const texture = new THREE.DataTexture(data, 64, 64);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4); texture.needsUpdate = true;
    material.roughnessMap = texture; textures.add(texture);
  }
  const clamp = THREE.MathUtils.clamp;
  let choreography = () => {};
  const lerp = THREE.MathUtils.lerp;

  if (type === 'brand') {
    const circle = ring(.31, .095, gold, [-.4, 0, .03]);
    const triangleShape = new THREE.Shape().moveTo(0, .38).lineTo(.35, -.26).lineTo(-.35, -.26).closePath();
    const triangle = mesh(new THREE.ExtrudeGeometry(triangleShape, { depth: .11, bevelEnabled: true,
      bevelSize: .025, bevelThickness: .025, bevelSegments: 3, steps: 1 }), glass, root, [.38, 0, 0]);
    const square = box(.46, .46, .15, navy, root, [0, -.1, .15]); square.rotation.z = Math.PI / 4;
    const seam = ring(.18, .018, gold, [0, -.1, .24]);
    choreography = (t, h, a) => {
      const spread = (1 - a) * h;
      circle.position.x = -.4 - spread * .4;
      triangle.position.x = .38 + spread * .4;
      triangle.position.y = spread * .18;
      square.position.z = .15 + spread * .45;
      square.rotation.z = Math.PI / 4 + spread * .22;
      seam.material.roughness = .17 + Math.sin(t * .6) * .025;
      root.rotation.z = Math.sin(t * .35) * .014;
    };
  } else if (type === 'lens') {
    root.rotation.x = -.1;
    cylinder(.66, .55, navy, [0, 0, -.08]);
    ring(.63, .025, gold, [0, 0, .22]);
    for (const depth of [-.33, -.27, -.21, -.15]) ring(.648, .008, navy, [0, 0, depth]);
    ring(.59, .012, gold, [0, 0, -.35]);
    const focus = new THREE.Group(); root.add(focus);
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI * 2 / 32;
      const knurl = box(.018, .07, .09, i % 4 ? navy : gold, focus, [Math.cos(angle) * .63, Math.sin(angle) * .63, .12], .004);
      knurl.rotation.z = angle - Math.PI / 2;
    }
    cylinder(.51, .06, navy, [0, 0, .25]);
    const iris = new THREE.Group(); iris.position.z = .31; root.add(iris);
    const blades = [];
    const bladeShape = new THREE.Shape().moveTo(-.04, -.06).lineTo(.35, -.02).quadraticCurveTo(.42, .19, .13, .32).lineTo(-.04, .12).closePath();
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: '#778285', metalness: .85, roughness: .27 });
    for (let i = 0; i < 7; i++) {
      const pivot = new THREE.Group(); pivot.rotation.z = i * Math.PI * 2 / 7; iris.add(pivot);
      const blade = mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: .006, bevelEnabled: false, steps: 1 }), bladeMaterial, pivot, [.12, 0, i * .001]);
      blades.push(blade);
    }
    const opticalGlass = new THREE.MeshPhysicalMaterial({ color: '#d1e2ee', metalness: 0,
      roughness: .035, transmission: .72, thickness: .065, ior: 1.52, envMapIntensity: .9 });
    const optic = cylinder(.43, .035, opticalGlass, [0, 0, .4]);
    cylinder(.39, .018, glass, [0, 0, .34]);
    ring(.46, .015, gold, [0, 0, .39]);
    const glint = ring(.33, .007, ivory, [-.035, .03, .42]); glint.scale.set(.9, .65, 1);
    choreography = (t, h, a) => {
      focus.rotation.z = Math.sin(t * .4) * .04 + h * (a - .5) * .6;
      blades.forEach(blade => { blade.rotation.z = -.25 + h * a * (.55 + Math.sin(t * .7) * .2); });
      optic.position.z = .4 + h * Math.sin(t * .55) * .035;
      root.rotation.y = -.28 + Math.sin(t * .24) * .16;
    };
  } else if (type === 'building') {
    const concrete = ivory.clone(); concrete.color.set('#c5c3b7'); concrete.roughness = .88; grain(concrete, 25, 225);
    const blueprint = new THREE.MeshStandardMaterial({ color: '#193852', roughness: .7, metalness: .2 });
    box(1.65, .045, 1.05, blueprint, root, [0, -.62, 0]);
    for (let i = -3; i <= 3; i++) {
      strut([i * .22, -.59, -.5], [i * .22, -.59, .5], .003);
      strut([-.8, -.59, i * .14], [.8, -.59, i * .14], .003);
    }
    const building = new THREE.Group(); root.add(building);
    const floors = [];
    for (let level = 0; level < 5; level++) {
      const floor = new THREE.Group(); floor.position.y = -.45 + level * .23; building.add(floor);
      box(.82, .055, .62, concrete, floor);
      if (level < 4) {
        box(.74, .19, .54, glass, floor, [0, .12, 0]);
        for (const x of [-.36, 0, .36]) box(.018, .21, .56, gold, floor, [x, .12, 0], .003);
      }
      floors.push(floor);
    }
    box(.17, .1, .14, navy, root, [.15, -.5, .31]);
    root.rotation.y = -.38;
    choreography = (t, h, a) => {
      floors.forEach((floor, i) => {
        const progress = clamp(a * 1.5 - i * .1, 0, 1);
        floor.scale.y = lerp(1, Math.max(.025, progress), h);
        floor.position.y = lerp(-.45 + i * .23, -.45 + i * .23 * progress, h);
      });
      glass.opacity = .64 + Math.sin(t * .4) * .025;
    };
  } else if (type === 'gem') {
    const diamond = new THREE.MeshPhysicalMaterial({ color: '#fff7e7', metalness: 0, roughness: .025,
      transmission: .94, thickness: .65, ior: 2.42, dispersion: .045, envMapIntensity: 1.15, flatShading: true });
    mesh(new THREE.LatheGeometry([new THREE.Vector2(0, -.22), new THREE.Vector2(.39, .22),
      new THREE.Vector2(.4, .26), new THREE.Vector2(.2, .46), new THREE.Vector2(0, .46)], 8), diamond);
    ring(.44, .07, gold, [0, -.3, 0]);
    const gallery = ring(.31, .025, gold, [0, .06, 0]); gallery.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      strut([Math.cos(a) * .28, -.2, Math.sin(a) * .28], [Math.cos(a) * .38, .25, Math.sin(a) * .38], .025);
      mesh(new THREE.SphereGeometry(.031, 12, 8), gold, root, [Math.cos(a) * .38, .25, Math.sin(a) * .38]);
    }
    root.rotation.x = .25;
    choreography = (t, h) => { root.rotation.y = t * Math.PI * 2 / 20; root.position.y = Math.sin(t * .5) * .012; diamond.dispersion = .035 + h * .02; };
  } else if (type === 'paper') {
    const paper = ivory.clone(); paper.roughness = .78; grain(paper, 22, 230);
    const satin = new THREE.MeshStandardMaterial({ color: '#b58b2e', roughness: .34, metalness: .8 });
    const fold = new THREE.Group(); fold.position.x = -.68; root.add(fold);
    const hinges = [];
    let parent = fold;
    for (let i = 0; i < 3; i++) {
      const hinge = new THREE.Group(); if (i) hinge.position.x = .46;
      parent.add(hinge);
      box(.46, .94, .018, paper, hinge, [.23, 0, 0], .004);
      box(.3, .025, .003, satin, hinge, [.23, .25, .012], .001);
      for (let line = 0; line < 4; line++) box(.25 - line * .025, .009, .003, navy, hinge, [.2, .06 - line * .08, .012], .001);
      hinges.push(hinge); parent = hinge;
    }
    root.rotation.set(.12, -.18, -.08);
    choreography = (t, h, a) => {
      hinges[1].rotation.y = -.08 + Math.sin(t * .3) * .018 - h * (1 - a) * 1.2;
      hinges[2].rotation.y = .1 - Math.sin(t * .3) * .018 + h * (1 - a) * 1.2;
    };
  } else if (type === 'network') {
    const points = [[-.65, 0, 0], [.65, 0, .05], [0, .5, -.16], [0, -.5, .12]];
    const links = [[0, 1], [0, 2], [0, 3], [2, 1], [3, 1]];
    const pulseMaterial = new THREE.MeshStandardMaterial({ color: '#fff2b8', emissive: '#d4af37', emissiveIntensity: .25, roughness: .18, metalness: .5 });
    points.forEach((point, i) => {
      mesh(new THREE.SphereGeometry(i < 2 ? .12 : .095, 20, 12), gold, root, point);
      const halo = ring(.17, .008, glass, point); halo.rotation.y = i * .12;
    });
    const vectors = points.map(point => new THREE.Vector3(...point));
    const wires = [];
    const pulses = links.map(([a, b]) => {
      wires.push(strut(points[a], points[b], .012, glass));
      return mesh(new THREE.SphereGeometry(.025, 8, 6), pulseMaterial);
    });
    const wireLengths = wires.map(wire => wire.scale.y);
    choreography = (t, h, a) => {
      pulses.forEach((pulse, i) => {
        const progress = (t * (.12 + h * .15) + i * .21) % 1;
        const [start, end] = links[i]; pulse.position.copy(vectors[start]).lerp(vectors[end], progress);
        const formed = clamp(a * 1.4 - i * .08, 0, 1);
        wires[i].scale.y = wireLengths[i] * lerp(1, Math.max(.001, formed), h);
        pulse.visible = !h || formed > .95;
      });
      root.rotation.y = Math.sin(t * .22) * .08;
    };
  } else if (type === 'browser') {
    box(1.5, 1.02, .075, navy, root);
    box(1.4, .86, .018, glass, root, [0, -.035, .052]);
    box(1.4, .1, .025, gold, root, [0, .43, .058]);
    for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(.018, 8, 6), ivory, root, [-.6 + i * .07, .43, .08]);
    const layers = [box(1.2, .31, .025, gold, root, [0, .15, .09]),
      box(.55, .26, .025, ivory, root, [-.32, -.21, .09]),
      box(.55, .26, .025, glass, root, [.32, -.21, .09])];
    const reflection = new THREE.MeshBasicMaterial({ color: '#fff2b8', transparent: true, opacity: .08, depthWrite: false });
    const sheen = box(.18, .78, .002, reflection, root, [-.5, -.035, .12], .001); sheen.rotation.z = -.35;
    root.rotation.y = -.12;
    choreography = (t, h, a) => {
      layers.forEach((layer, i) => { layer.position.z = .09 + h * (1 - clamp(a * 1.5 - i * .15, 0, 1)) * (.22 + i * .09); });
      sheen.position.x = Math.sin(t * .25) * .55;
    };
  } else if (type === 'stage') {
    const floor = new THREE.MeshPhysicalMaterial({ color: '#182337', metalness: .55, roughness: .24 });
    box(1.65, .1, .95, floor, root, [0, -.55, 0]);
    box(1.6, .045, .035, gold, root, [0, -.49, .46]);
    box(1.4, 1.08, .05, navy, root, [0, .03, -.4]);
    const truss = new THREE.Group(); root.add(truss);
    for (const sign of [-1, 1]) box(.035, 1.18, .04, gold, truss, [sign * .75, .08, -.36]);
    box(1.55, .045, .05, gold, truss, [0, .67, -.36]);
    const wings = [];
    for (const sign of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(sign * .7, .02, -.36); root.add(hinge);
      box(.4, 1.05, .04, gold, hinge, [-sign * .2, 0, 0]); wings.push(hinge);
      const fixture = cylinder(.065, .14, navy, [sign * .48, .62, -.15]); fixture.rotation.x = .35;
    }
    const beamMaterial = new THREE.MeshBasicMaterial({ color: '#fff2b8', transparent: true, opacity: .045,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const beams = [-1, 1].map(sign => {
      const beam = mesh(new THREE.ConeGeometry(.27, 1.1, 20, 1, true), beamMaterial, root, [sign * .35, .05, .03]);
      beam.rotation.z = sign * .18; return beam;
    });
    const spot = new THREE.SpotLight('#fff0c7', 3, 4, .4, .7, 1.5);
    spot.position.set(.4, 1.3, .5); spot.target.position.set(0, -.5, 0); root.add(spot, spot.target);
    root.rotation.y = -.16;
    choreography = (t, h, a) => {
      wings.forEach((wing, i) => { wing.rotation.y = (i ? 1 : -1) * (.1 + h * a * 1.05); });
      truss.scale.y = lerp(1, Math.max(.05, a), h);
      beams.forEach((beam, i) => { beam.rotation.z = (i ? 1 : -1) * (.18 + Math.sin(t * .35) * .06); });
      spot.target.position.x = Math.sin(t * .35) * .22;
      spot.intensity = 2.2 + h * a * .8;
      beamMaterial.opacity = .045 * lerp(1, a, h);
    };
  } else {
    throw new Error(`Unknown service model: ${type}`);
  }

  // A soft contact patch gives scale/depth without eight shadow-map render passes.
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const radius = Math.hypot((x - 15.5) / 16, (y - 15.5) / 16);
    pixels.set([0, 0, 0, Math.pow(Math.max(0, 1 - radius), 2) * 105], (y * 32 + x) * 4);
  }
  const shadowTexture = new THREE.DataTexture(pixels, 32, 32); shadowTexture.needsUpdate = true; textures.add(shadowTexture);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.78;
  geometries.add(shadow.geometry); materials.add(shadow.material);
  const presentation = new THREE.Group(); presentation.add(root, shadow);
  const initial = root.rotation.clone();
  return {
    object: presentation,
    update(time, hover = 0, assembly = 1, pointer = { x: 0, y: 0 }, reveal = 1) {
      root.rotation.copy(initial);
      choreography(time, hover, assembly);
      const response = { brand: .18, lens: .1, building: .09, gem: .2, paper: .12, network: .16, browser: .09, stage: .07 }[type];
      root.rotation.y += pointer.x * response * hover;
      root.rotation.x += pointer.y * response * .55 * hover;
      root.position.z = hover * (type === 'lens' ? .14 : .08);
      presentation.rotation.x = .08;
      presentation.scale.setScalar(.92 + .08 * reveal);
      presentation.position.z = -.22 * (1 - reveal);
    },
    dispose() {
      geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
      presentation.clear();
    },
  };
}
