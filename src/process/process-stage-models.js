import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PROCESS_SCENES = ['Understand', 'Plan', 'Create', 'Build', 'Produce', 'Promote', 'Execute', 'Grow'];

// Dedicated process miniatures share the tunnel's lighting and environment map.
export function createProcessStageModel(index) {
  if (!PROCESS_SCENES[index]) throw new Error('Unknown process stage');
  const object = new THREE.Group(), geometry = new Set(), materials = new Set();
  const gold = new THREE.MeshPhysicalMaterial({ color: '#d4af37', metalness: 1, roughness: .16, envMapIntensity: 1.3 });
  const navy = new THREE.MeshStandardMaterial({ color: '#14263f', metalness: .5, roughness: .3 });
  const paper = new THREE.MeshStandardMaterial({ color: '#e6ddc8', roughness: .78 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#b3cdd7', roughness: .045, metalness: 0,
    transmission: .65, thickness: .06, ior: 1.5 });
  const lamp = new THREE.MeshStandardMaterial({ color: '#f6d66b', emissive: '#d4af37', emissiveIntensity: .13, roughness: .3 });
  [gold, navy, paper, glass, lamp].forEach(material => materials.add(material));
  function mesh(shape, material, parent = object, position = [0, 0, 0]) {
    geometry.add(shape); materials.add(material);
    const part = new THREE.Mesh(shape, material);
    part.castShadow = !material.transparent && !(material.transmission > 0);
    part.receiveShadow = part.castShadow;
    part.position.set(...position); parent.add(part); return part;
  }
  function box(w, h, d, material, position, parent = object) {
    return mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(.025, w / 5, h / 5, d / 5)), material, parent, position);
  }
  function ring(r, tube, position, parent = object) { return mesh(new THREE.TorusGeometry(r, tube, 10, 48), gold, parent, position); }
  function rod(a, b, radius = .009, material = gold, parent = object) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const part = mesh(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 8), material, parent);
    part.position.copy(start).add(end).multiplyScalar(.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()); return part;
  }
  const phase = (p, delay = 0) => THREE.MathUtils.smoothstep(p, delay, 1);
  let choreography = () => {};
  // A small matte display plinth grounds the miniature without changing the floor.
  box(1.38, .07, .85, navy, [0, -.55, 0]);
  if (index === 0) {
    box(1.08, .018, .66, paper, [0, -.49, .02]);
    for (let i = 0; i < 5; i++) box(.65 - i * .05, .003, .009, i === 0 ? gold : navy, [-.08, -.478, -.19 + i * .09]);
    const magnifier = new THREE.Group(); magnifier.position.set(.1, -.1, .12); magnifier.rotation.x = -.6; object.add(magnifier);
    ring(.22, .024, [0, 0, 0], magnifier);
    const optic = mesh(new THREE.CylinderGeometry(.2, .2, .035, 32), glass, magnifier); optic.rotation.x = Math.PI / 2;
    const handle = box(.075, .34, .07, gold, [.2, -.23, 0], magnifier); handle.rotation.z = .65;
    const scan = box(.6, .004, .018, lamp, [0, -.468, 0]);
    choreography = (p, t) => {
      magnifier.position.y = -.1 + (1 - p) * .3;
      magnifier.position.x = .1 + Math.sin(t * .5) * .055;
      scan.position.z = Math.sin(t * .65) * .2;
    };
  } else if (index === 1) {
    const smoke = new THREE.MeshPhysicalMaterial({ color: '#354c58', metalness: .08, roughness: .085,
      transmission: .52, thickness: .09, ior: 1.5, envMapIntensity: 1.2 });
    const enamel = new THREE.MeshStandardMaterial({ color: '#d1c7ad', roughness: .55, metalness: .05 });
    const workspace = new THREE.Group(); workspace.name = 'plan-strategy-workspace'; object.add(workspace);
    const table = new THREE.Group(); table.name = 'strategy-table'; workspace.add(table);
    box(1.15, .055, .7, smoke, [0, -.34, 0], table);
    for (const x of [-.48, .48]) for (const z of [-.25, .25]) box(.025, .15, .025, gold, [x, -.44, z], table);
    box(1.13, .012, .012, gold, [0, -.33, .34], table);
    const board = new THREE.Group(); board.name = 'strategy-floating-board'; workspace.add(board);
    box(.98, .035, .6, smoke, [0, 0, 0], board);
    for (const z of [-.3, .3]) box(.98, .006, .008, gold, [0, .02, z], board);
    const points = [[-.32, .045, -.17], [0, .045, -.18], [.31, .045, -.08], [.18, .045, .17], [-.26, .045, .17]];
    const markers = points.map((point, i) => {
      const marker = mesh(new THREE.CylinderGeometry(.023, .03, .03, 20), gold, board, point);
      marker.name = `strategy-marker-${i}`; return marker;
    });
    const links = [[0, 1], [1, 2], [1, 3], [3, 4], [4, 0]].map(([from, to], i) => {
      const path = new THREE.LineCurve3(new THREE.Vector3(...points[from]), new THREE.Vector3(...points[to]));
      const link = mesh(new THREE.TubeGeometry(path, 12, .005, 6, false), gold, board);
      link.name = `strategy-connection-${i}`; return link;
    });
    const cards = [];
    for (let i = 0; i < 3; i++) {
      const card = new THREE.Group(); card.name = `strategy-planning-card-${i}`;
      card.position.set(-.33 + i * .19, -.285, .19); workspace.add(card);
      box(.17, .012, .14, i === 1 ? navy : enamel, [0, 0, 0], card);
      box(.11, .003, .008, gold, [0, .008, -.035], card);
      for (let line = 0; line < 2; line++) box(.1 - line * .025, .003, .004, i === 1 ? enamel : navy, [-.01, .008, .005 + line * .025], card);
      cards.push(card);
    }
    const compass = new THREE.Group(); compass.name = 'strategy-navigation-dial'; compass.position.set(.37, -.28, .18); workspace.add(compass);
    const dial = mesh(new THREE.CylinderGeometry(.118, .118, .026, 40), navy, compass);
    const rim = ring(.116, .009, [0, .017, 0], compass); rim.rotation.x = Math.PI / 2;
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI * 2 / 24;
      const tick = box(.004, .003, i % 6 ? .012 : .026, gold, [Math.sin(angle) * .096, .017, Math.cos(angle) * .096], compass);
      tick.rotation.y = angle;
    }
    const needle = new THREE.Group(); needle.name = 'strategy-compass-needle'; compass.add(needle);
    const arrow = new THREE.Shape().moveTo(0, .085).lineTo(.022, -.048).lineTo(0, -.025).lineTo(-.022, -.048).closePath();
    const pointer = mesh(new THREE.ExtrudeGeometry(arrow, { depth: .004, bevelEnabled: true, bevelSize: .002, bevelThickness: .002, bevelSegments: 1, steps: 1 }), gold, needle, [0, .025, 0]);
    pointer.rotation.x = -Math.PI / 2;
    choreography = (p, t) => {
      const tableBuilt = phase(p), boardBuilt = phase(p, .12);
      table.scale.y = Math.max(.001, tableBuilt);
      board.position.y = -.28 + boardBuilt * .34 + Math.sin(t * .4) * .009 * boardBuilt;
      board.rotation.x = .12 * boardBuilt;
      board.scale.setScalar(.84 + boardBuilt * .16);
      markers.forEach((marker, i) => { marker.scale.setScalar(Math.max(.001, phase(p, .22 + i * .055))); });
      links.forEach((link, i) => {
        const draw = phase(p, .36 + i * .065);
        link.geometry.setDrawRange(0, Math.floor(link.geometry.index.count * draw / 3) * 3);
      });
      cards.forEach((card, i) => {
        const organized = phase(p, .4 + i * .1);
        card.position.x = -.33 + i * .19 + (1 - organized) * (i - 1) * .17;
        card.position.y = -.285 + (1 - organized) * .12;
        card.rotation.y = (1 - organized) * (i - 1) * .4;
      });
      compass.scale.setScalar(Math.max(.001, phase(p, .5)));
      needle.rotation.y = -.5 + phase(p, .55) * .7 + Math.sin(t * .32) * .12;
      dial.material.roughness = .3;
    };
  } else if (index === 2) {
    // Stage 03 only: a complete cinema rig, with an independently articulated
    // nine-blade iris and a genuine curved, perforated strip of photographic film.
    const black = new THREE.MeshStandardMaterial({ color: '#111419', metalness: .18, roughness: .54 });
    const alloy = new THREE.MeshPhysicalMaterial({ color: '#626c74', metalness: .92, roughness: .27 });
    const rubber = new THREE.MeshStandardMaterial({ color: '#090d11', metalness: 0, roughness: .78 });
    const optics = new THREE.MeshPhysicalMaterial({ color: '#d1e0e8', metalness: 0, roughness: .025,
      transmission: .78, thickness: .055, ior: 1.52, envMapIntensity: 1.15 });
    const rig = new THREE.Group(); rig.name = 'create-cinema-rig'; rig.rotation.y = -.18; object.add(rig);
    const body = new THREE.Group(); body.name = 'cinema-body'; rig.add(body);
    box(.57, .4, .38, black, [-.13, -.16, -.08], body);
    box(.15, .34, .13, rubber, [-.43, -.16, -.07], body);
    box(.08, .3, .24, black, [.21, -.15, -.08], body);
    box(.12, .31, .16, black, [-.18, -.15, -.33], body); // Rear battery.
    for (let i = 0; i < 7; i++) box(.012, .17, .009, rubber, [-.32 + i * .047, -.16, .116], body);
    box(.09, .025, .006, gold, [-.28, -.04, .119], body);
    const monitor = box(.018, .18, .25, alloy, [-.44, -.02, -.05], body);
    box(.008, .145, .21, glass, [-.452, -.02, -.05], body);
    for (let i = 0; i < 3; i++) {
      const dial = mesh(new THREE.CylinderGeometry(.026, .026, .016, 16), alloy, body, [-.42, -.12 + i * .07, .06]);
      dial.rotation.z = Math.PI / 2;
    }
    const support = new THREE.Group(); support.name = 'cinema-support'; rig.add(support);
    box(.61, .055, .5, alloy, [-.05, -.41, -.03], support);
    for (const x of [-.13, .13]) {
      const rail = mesh(new THREE.CylinderGeometry(.014, .014, .8, 12), alloy, support, [x, -.44, .09]); rail.rotation.x = Math.PI / 2;
    }
    box(.065, .15, .065, alloy, [-.25, .1, -.16], support);
    box(.37, .055, .09, rubber, [-.08, .2, -.16], support);
    box(.04, .1, .055, alloy, [.1, .13, -.16], support);
    const lens = new THREE.Group(); lens.name = 'cinema-lens'; lens.position.set(.08, -.15, .22); rig.add(lens);
    function barrel(radius, depth, z, material) {
      const part = mesh(new THREE.CylinderGeometry(radius, radius, depth, 40), material, lens, [0, 0, z]);
      part.rotation.x = Math.PI / 2; return part;
    }
    barrel(.207, .32, .035, black);
    barrel(.218, .065, -.065, rubber);
    barrel(.222, .055, .09, rubber);
    for (const z of [-.14, -.105, .03, .14, .195]) {
      const band = mesh(new THREE.TorusGeometry(.21, .008, 8, 48), z === .195 ? gold : alloy, lens, [0, 0, z]);
      band.name = 'cinema-lens-machined-ring';
    }
    const focus = new THREE.Group(); focus.name = 'cinema-focus-ring'; lens.add(focus);
    for (let i = 0; i < 36; i++) {
      const angle = i * Math.PI * 2 / 36;
      const knurl = box(.012, .035, .045, i % 6 ? rubber : alloy,
        [Math.cos(angle) * .221, Math.sin(angle) * .221, .09], focus);
      knurl.rotation.z = angle - Math.PI / 2;
    }
    barrel(.19, .022, .18, rubber);
    const irisMaterial = new THREE.MeshStandardMaterial({ color: '#647078', metalness: .9, roughness: .29 });
    const bladeShape = new THREE.Shape().moveTo(-.125, -.055)
      .quadraticCurveTo(-.16, .04, -.045, .115).lineTo(.06, .06)
      .quadraticCurveTo(.06, -.03, -.125, -.055).closePath();
    const blades = [];
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9;
      const pivot = new THREE.Group(); pivot.name = `cinema-iris-pivot-${i}`;
      pivot.position.set(Math.cos(angle) * .115, Math.sin(angle) * .115, .202 + i * .00025); lens.add(pivot);
      mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: .0018, bevelEnabled: false, curveSegments: 8, steps: 1 }), irisMaterial, pivot);
      blades.push({ pivot, angle });
    }
    const frontGlass = mesh(new THREE.SphereGeometry(.18, 32, 16), optics, lens, [0, 0, .237]); frontGlass.scale.z = .105;
    frontGlass.name = 'cinema-convex-optics';
    const rearGlass = mesh(new THREE.SphereGeometry(.155, 24, 12), glass, lens, [0, 0, .16]); rearGlass.scale.z = .075;
    for (const sign of [-1, 1]) {
      box(.035, .51, .11, black, [sign * .254, 0, .245], lens);
      box(.48, .035, .11, black, [0, sign * .238, .245], lens);
    }
    const coating = new THREE.MeshPhysicalMaterial({ color: '#fff2b8', metalness: .8, roughness: .07,
      transparent: true, opacity: .1, depthWrite: false });
    const reflection = mesh(new THREE.TorusGeometry(.13, .0025, 6, 40, Math.PI * .55), coating, lens, [-.02, .02, .259]);
    reflection.name = 'cinema-lens-reflection';

    const film = new THREE.Group(); film.name = 'cinema-curved-film'; object.add(film);
    const filmStock = new THREE.MeshPhysicalMaterial({ color: '#17202a', metalness: .18, roughness: .32, side: THREE.DoubleSide });
    const emulsion = new THREE.MeshPhysicalMaterial({ color: '#625b46', metalness: .32, roughness: .24, side: THREE.DoubleSide });
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.55, -.24, -.33), new THREE.Vector3(-.72, .2, -.4),
      new THREE.Vector3(-.44, .5, -.46), new THREE.Vector3(.15, .57, -.5),
      new THREE.Vector3(.69, .32, -.32), new THREE.Vector3(.74, -.15, -.03),
    ]);
    const filmParts = [];
    function ribbon(start, end, low, high, material) {
      const positions = [], indices = [], segments = Math.max(2, Math.ceil((end - start) * 100));
      for (let i = 0; i <= segments; i++) {
        const u = start + (end - start) * i / segments;
        const point = path.getPoint(u), tangent = path.getTangent(u);
        const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), tangent).normalize();
        for (const width of [low, high]) positions.push(point.x + side.x * width, point.y + side.y * width, point.z + side.z * width);
        if (i < segments) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const shape = new THREE.BufferGeometry(); shape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      shape.setIndex(indices); shape.computeVertexNormals(); mesh(shape, material, film);
      filmParts.push({ shape, start, end });
    }
    ribbon(0, 1, -.11, -.092, filmStock); ribbon(0, 1, .092, .11, filmStock); ribbon(0, 1, -.067, .067, filmStock);
    for (let i = 0; i < 12; i++) {
      const start = i / 12;
      ribbon(start, Math.min(1, start + .013), -.11, .11, filmStock); // Bridges leave real sprocket gaps.
      ribbon(start + .018, Math.min(1, start + .069), -.054, .054, emulsion);
    }
    choreography = (p, t) => {
      const assembledBody = phase(p), assembledLens = phase(p, .13), assembledSupport = phase(p, .25);
      body.position.set(-.19 * (1 - assembledBody), .12 * (1 - assembledBody), -.15 * (1 - assembledBody));
      lens.position.z = .22 + .38 * (1 - assembledLens);
      lens.rotation.y = -.14 * (1 - assembledLens) + Math.sin(t * .24) * .025 * assembledLens;
      support.position.y = -.17 * (1 - assembledSupport);
      focus.rotation.z = Math.sin(t * .32) * .045;
      const aperture = .35 + Math.sin(t * .7) * .22;
      blades.forEach(({ pivot, angle }) => { pivot.rotation.z = angle + .25 + aperture * .55; });
      reflection.rotation.z = t * .22; reflection.position.x = -.02 + Math.sin(t * .3) * .025;
      const developed = phase(p, .48);
      filmParts.forEach(({ shape, start, end }) => {
        const drawn = THREE.MathUtils.clamp((developed - start) / (end - start), 0, 1);
        shape.setDrawRange(0, Math.floor(shape.index.count * drawn / 3) * 3);
      });
      film.position.y = Math.sin(t * .28) * .009 * developed;
      rig.position.y = Math.sin(t * .6) * .012 * p;
      rig.rotation.y = -.18 + assembledBody * .1 + Math.sin(t * .22) * .012;
      monitor.rotation.y = -.12 * assembledBody;
    };
  } else if (index === 3) {
    const browser = new THREE.Group(); browser.rotation.y = -.12; object.add(browser);
    box(1.15, .76, .055, navy, [0, -.02, 0], browser);
    box(1.06, .08, .025, gold, [0, .29, .045], browser);
    const layers = [box(.95, .21, .03, glass, [0, .1, .065], browser),
      box(.42, .25, .025, paper, [-.25, -.2, .07], browser), box(.42, .25, .025, glass, [.25, -.2, .07], browser)];
    for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(.014, 8, 6), paper, browser, [-.46 + i * .06, .29, .066]);
    choreography = (p, t) => { layers.forEach((layer, i) => { layer.position.z = .07 + (1 - phase(p, i * .15)) * (.32 + i * .12); });
      browser.rotation.y = -.12 + Math.sin(t * .26) * .025; };
  } else if (index === 4) {
    const packaging = new THREE.Group(); object.add(packaging);
    box(.7, .04, .52, paper, [0, -.44, 0], packaging);
    const walls = [box(.7, .34, .025, navy, [0, -.27, -.25], packaging), box(.7, .34, .025, navy, [0, -.27, .25], packaging),
      box(.025, .34, .5, navy, [-.34, -.27, 0], packaging), box(.025, .34, .5, navy, [.34, -.27, 0], packaging)];
    const lid = new THREE.Group(); lid.position.set(0, -.08, -.25); packaging.add(lid);
    box(.73, .04, .54, navy, [0, 0, .26], lid); box(.43, .005, .025, gold, [0, .023, .27], lid);
    const cards = Array.from({ length: 3 }, (_, i) => {
      const sheet = box(.48, .015, .32, paper, [0, -.3 + i * .025, 0], packaging);
      box(.28, .003, .012, gold, [0, .009, -.06], sheet); return sheet;
    });
    choreography = (p, t) => { walls.forEach((wall, i) => { wall.scale.y = Math.max(.001, phase(p, i * .06)); });
      lid.rotation.x = -phase(p, .3) * 1.7; cards.forEach((card, i) => { card.position.y = -.3 + i * .025 + phase(p, .55) * (.12 + i * .08); });
      packaging.rotation.y = -.18 + Math.sin(t * .2) * .02; };
  } else if (index === 5) {
    box(.08, .42, .08, gold, [0, -.3, 0]);
    box(.9, .62, .06, navy, [0, .12, 0]);
    box(.81, .53, .012, glass, [0, .12, .04]);
    box(.52, .05, .008, gold, [0, .23, .055]);
    for (let i = 0; i < 3; i++) box(.48 - i * .09, .015, .008, paper, [-.02, .1 - i * .07, .056]);
    const channels = [], pulses = [];
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * .49, y = -.2 - Math.abs(i - 1) * .06;
      const link = rod([0, -.14, .03], [x, y, .28], .009, gold); channels.push(link);
      mesh(new THREE.SphereGeometry(.05, 16, 10), gold, object, [x, y, .28]);
      const pulse = mesh(new THREE.SphereGeometry(.017, 8, 6), lamp); pulses.push({ pulse, target: new THREE.Vector3(x, y, .28) });
    }
    const origin = new THREE.Vector3(0, -.14, .03);
    choreography = (p, t) => { channels.forEach((channel, i) => { channel.scale.y = Math.max(.001, phase(p, i * .15)); });
      pulses.forEach(({ pulse, target }, i) => { pulse.position.copy(origin).lerp(target, (t * .18 + i * .3) % 1); pulse.visible = p > .7; }); };
  } else if (index === 6) {
    box(1.05, .07, .55, navy, [0, -.43, 0]);
    const stage = new THREE.Group(); object.add(stage);
    const pillars = [-1, 1].map(sign => box(.04, .75, .04, gold, [sign * .48, -.01, -.21], stage));
    box(1.02, .05, .04, gold, [0, .36, -.21], stage);
    box(.68, .32, .025, navy, [0, .09, -.2], stage);
    box(.4, .025, .008, gold, [0, .13, -.18], stage);
    const spot = new THREE.SpotLight('#fff0ce', 0, 3, .42, .8, 1.4);
    spot.position.set(.2, .9, .6); spot.target.position.set(0, -.4, 0); object.add(spot, spot.target);
    const beamMaterial = new THREE.MeshBasicMaterial({ color: '#fff2b8', transparent: true, opacity: .045, side: THREE.DoubleSide, depthWrite: false });
    const beam = mesh(new THREE.ConeGeometry(.3, .9, 20, 1, true), beamMaterial, object, [0, .05, .05]);
    choreography = (p, t) => { stage.scale.y = Math.max(.001, phase(p)); pillars.forEach(pillar => { pillar.scale.x = .8 + .2 * phase(p); });
      spot.intensity = phase(p, .5) * 1.4; spot.target.position.x = Math.sin(t * .35) * .12;
      beam.rotation.z = Math.sin(t * .35) * .04; beamMaterial.opacity = phase(p, .5) * .045; };
  } else {
    const trunk = rod([0, -.48, 0], [0, .31, 0], .027);
    const branches = [], leaves = [];
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4, y = -.16 + i * .085, spread = .2 + (7 - i) * .02;
      const end = [Math.cos(angle) * spread, y + .15, Math.sin(angle) * spread];
      branches.push(rod([0, y - .14, 0], end, .012));
      const leaf = mesh(new THREE.SphereGeometry(.06, 16, 10), i % 2 ? gold : glass, object, end); leaf.scale.set(1, 1.4, .65); leaves.push(leaf);
    }
    choreography = (p, t) => { trunk.scale.y = Math.max(.001, phase(p)); branches.forEach((branch, i) => {
      const grow = phase(p, .15 + i * .07); branch.scale.y = Math.max(.001, grow); leaves[i].scale.set(grow, grow * 1.4, grow * .65);
    }); object.rotation.y = Math.sin(t * .18) * .035; };
  }
  let disposed = false;
  return {
    object,
    update(reveal, time) { choreography(THREE.MathUtils.clamp(reveal, 0, 1), time); },
    dispose() { if (disposed) return; disposed = true; geometry.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); object.clear(); },
  };
}
