import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';


const phase = (p, start, span) => THREE.MathUtils.smoothstep(p, start, start + span);
const lerp = THREE.MathUtils.lerp;

export function frameIndustryCamera(camera, aspect) {
  camera.aspect = aspect;
  camera.zoom = Math.min(1, aspect / 1.44);
  camera.updateProjectionMatrix();
}

function brilliantCut(radius) {
  const vertices = [];
  const rings = [[.54, .24, 0], [.83, .125, .5], [1, 0, 0], [.99, -.035, 0], [.48, -.32, .5]];
  const sides = 8;
  const points = rings.map(([width, height, offset]) => Array.from({ length: sides }, (_, i) => {
    const angle = (i + offset) * Math.PI * 2 / sides;
    return [Math.cos(angle) * width * radius, height * radius, Math.sin(angle) * width * radius];
  }));
  const triangle = (a, b, c) => vertices.push(...a, ...b, ...c);
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    triangle([0, .24 * radius, 0], points[0][next], points[0][i]);
    for (let row = 0; row < points.length - 1; row++) {
      const top = points[row], bottom = points[row + 1];
      triangle(top[i], top[next], bottom[i]);
      triangle(bottom[i], top[next], bottom[next]);
    }
    triangle(points[4][i], points[4][next], [0, -.63 * radius, 0]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createIndustryWorld(type) {
  const object = new THREE.Group(), geometries = new Set(), materials = new Set();
  const standard = (color, roughness = .6, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const gold = new THREE.MeshPhysicalMaterial({ color: '#d2a659', metalness: 1, roughness: .19, envMapIntensity: 1.5 });
  const stone = standard('#bdb3a0', .78);
  const charcoal = standard('#222a33', .45, .3);
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#85b2c5', metalness: .15, roughness: .12, transparent: true, opacity: .42,
    clearcoat: 1, depthWrite: false, envMapIntensity: 1.5,
  });
  const warm = new THREE.MeshStandardMaterial({ color: '#d8b17a', roughness: .57, emissive: '#ffad59', emissiveIntensity: 0 });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function mesh(geometry, material, position, parent = object) {
    geometries.add(geometry);
    materials.add(material);
    const node = new THREE.Mesh(geometry, material);
    node.position.set(...position);
    node.castShadow = !material.transparent && !(material.transmission > 0);
    node.receiveShadow = node.castShadow;
    parent.add(node);
    return node;
  }
  function box(w, h, d, material, position, parent = object) {
    const node = mesh(cube, material, position, parent);
    node.scale.set(w, h, d);
    return node;
  }
  function group(position, parent = object) {
    const node = new THREE.Group();
    node.position.set(...position);
    parent.add(node);
    return node;
  }
  function tube(points, radius, parent) {
    const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    return mesh(new THREE.TubeGeometry(path, 28, radius, 8, false), gold, [0, 0, 0], parent);
  }
  function base(width, depth) {
    mesh(new RoundedBoxGeometry(width, .13, depth, 2, .055), charcoal, [0, -.75, 0]);
    box(width - .06, .023, depth - .06, stone, [0, -.677, 0]);
  }
  function tree(x, z, color) {
    mesh(new THREE.CylinderGeometry(.018, .024, .19, 7), stone, [x, -.57, z]);
    const crown = mesh(new THREE.IcosahedronGeometry(.13, 1), color, [x, -.425, z]);
    crown.scale.set(.8, 1.35, .8);
  }

  let camera, update;
  if (type === 'architecture') {
    camera = { fov: 33, position: [3.4, 2.25, 4.75], target: [0, -.02, 0] };
    base(2.68, 1.85);
    const limestone = standard('#e6dccc', .65), mullion = standard('#78654c', .36, .75);
    const darkGlazing = standard('#294a5d', .22, .48), greenery = standard('#344e43', .83);
    const water = new THREE.MeshPhysicalMaterial({ color: '#448fa7', roughness: .11, metalness: .23, clearcoat: 1 });
    box(1.86, .17, 1.18, limestone, [-.08, -.58, -.14]);
    box(1.65, .12, .012, darkGlazing, [-.08, -.56, .46]);
    for (let i = 0; i < 7; i++) box(.018, .14, .03, mullion, [-.88 + i * .26, -.56, .472]);
    box(.94, .025, .33, water, [.49, -.647, .68]);
    box(.98, .016, .024, limestone, [.49, -.636, .86]);
    for (const [x, z] of [[-1.1, -.56], [-1.1, .64], [1.05, -.61], [-.63, .72]]) tree(x, z, greenery);
    const floors = [];
    for (const [x, z, count, width] of [[-.48, -.22, 5, .83], [.48, -.32, 7, .72]]) {
      for (let level = 0; level < count; level++) {
        const floor = group([x, -.49, z]);
        const terrace = level % 3 === 2;
        box(width + .085, .029, .7, limestone, [terrace ? .027 : 0, 0, .04], floor);
        box(width - .075, .154, .54, darkGlazing, [0, .093, 0], floor);
        box(width - .06, .106, .014, warm, [0, .085, .274], floor);
        box(width - .06, .133, .021, glass, [0, .094, .289], floor);
        for (let i = 0; i < 5; i++) box(.013, .154, .021, mullion, [(i / 4 - .5) * (width - .065), .089, .303], floor);
        for (const side of [-1, 1]) {
          box(.019, .135, .53, glass, [side * (width / 2 - .025), .09, 0], floor);
          for (let i = 0; i < 3; i++) box(.019, .15, .013, mullion, [side * (width / 2 - .014), .09, (i - 1) * .222], floor);
        }
        box(width, .018, .018, mullion, [0, .054, .38], floor);
        for (const side of [-1, 1]) box(.017, .054, .019, mullion, [side * width * .46, .035, .38], floor);
        if (level === count - 1) box(width + .05, .04, .66, limestone, [0, .17, 0], floor);
        floors.push({ floor, level, delay: level * .073 + (x > 0 ? .08 : 0) });
      }
    }
    update = (p, accent) => {
      for (const { floor, level, delay } of floors) {
        const build = phase(p, .035 + delay, .33);
        floor.visible = build > .005;
        floor.position.y = -.485 + level * .183 * build;
        floor.scale.y = Math.max(.01, build);
      }
      warm.emissiveIntensity = phase(p, .66, .31) * .45;
      object.rotation.y = -.24 * phase(accent, .73, .27);
    };
  } else if (type === 'jewellery') {
    camera = { fov: 36, position: [0, 1.05, 4.15], target: [0, -.02, 0] };
    const velvet = standard('#131626', .97);
    mesh(new THREE.CylinderGeometry(.87, .99, .17, 64), velvet, [0, -.66, 0]);
    mesh(new THREE.CylinderGeometry(.99, 1.015, .025, 64), gold, [0, -.75, 0]);
    const ring = group([0, -.04, 0]);
    const band = mesh(new THREE.TorusGeometry(.53, .077, 20, 80), gold, [0, 0, 0], ring);
    band.scale.z = 1.53;
    const diamond = new THREE.MeshPhysicalMaterial({
      color: '#f4faff', transmission: .84, thickness: .25, ior: 2.417, dispersion: .035, roughness: .025,
      envMapIntensity: 2.2, specularIntensity: 1, clearcoat: 1,
    });
    const mount = group([0, .62, 0], ring);
    const cut = brilliantCut(.255);
    mesh(cut, diamond, [0, .105, 0], mount);
    const collar = mesh(new THREE.TorusGeometry(.176, .021, 12, 36), gold, [0, .005, 0], mount);
    collar.rotation.x = Math.PI / 2;
    const tip = new THREE.SphereGeometry(.025, 10, 8);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      tube([[x * .077, -.085, z * .048], [x * .123, -.012, z * .107], [x * .176, .11, z * .158]], .019, mount);
      mesh(tip, gold, [x * .176, .11, z * .158], mount);
    }
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
      const angle = .26 + i * .14;
      const x = Math.sin(angle) * .54 * side, y = Math.cos(angle) * .54;
      const setting = mesh(tip, gold, [x, y, .078], ring);
      setting.scale.set(1.4, 1.4, .68);
      const pavé = mesh(cut, diamond, [x, y, .093], ring);
      pavé.scale.setScalar(.147 - i * .008);
      pavé.rotation.x = Math.PI / 2;
    }
    const glintMaterial = new THREE.MeshBasicMaterial({ color: '#fff2dc', transparent: true, opacity: 0, depthWrite: false });
    const glint = group([.045, .82, .17], ring);
    box(.098, .013, .004, glintMaterial, [0, 0, 0], glint);
    box(.013, .108, .004, glintMaterial, [0, 0, 0], glint);
    update = p => {
      ring.rotation.set(lerp(-.24, -.48, p), lerp(-.43, .61, p), -.11);
      glint.visible = p > .58 && p < .77;
      glintMaterial.opacity = .66 * Math.sin(Math.PI * phase(p, .58, .19));
      glint.scale.setScalar(.55 + glintMaterial.opacity);
    };
  } else if (type === 'storefront') {
    camera = { fov: 31, position: [2.9, 1.85, 4.65], target: [0, -.09, 0] };
    base(2.75, 1.65);
    const linen = standard('#ddc5a0', .8), wood = standard('#755039', .56), greenery = standard('#41594a', .9);
    const shell = group([0, -.66, 0]), glazing = group([0, -.66, 0]), canopy = group([0, -.66, 0]);
    box(2.14, .09, 1.04, linen, [0, .04, -.1], shell);
    box(2.14, .98, .085, linen, [0, .54, -.6], shell);
    for (const side of [-1, 1]) {
      box(.115, .99, 1.02, linen, [side * 1.01, .52, -.095], shell);
      box(.095, .92, .07, wood, [side * .95, .5, .43], glazing);
      box(.57, .045, .24, wood, [side * .55, .34, .16], shell);
      box(.57, .045, .24, wood, [side * .55, .54, .16], shell);
      for (let i = 0; i < 3; i++) {
        box(.077, .089 + i * .022, .09, i % 2 ? wood : warm, [side * (.37 + i * .135), .61, .15], shell);
      }
      box(.64, .62, .019, glass, [side * .61, .48, .461], glazing);
      box(.67, .023, .032, gold, [side * .61, .68, .485], glazing);
      box(.026, .64, .026, charcoal, [side * .63, .478, .483], glazing);
      tree(side * 1.18, .53, greenery);
    }
    box(.5, .73, .021, glass, [0, .438, .475], glazing);
    for (const x of [-.27, 0, .27]) box(.022, .76, .032, charcoal, [x, .435, .493], glazing);
    for (const x of [-.052, .052]) box(.015, .13, .033, gold, [x, .43, .513], glazing);
    box(2.2, .06, 1.09, stone, [0, 1.03, -.085], canopy);
    box(2.13, .21, .08, charcoal, [0, .905, .457], canopy);
    box(2.11, .017, .036, gold, [0, .815, .511], canopy);
    box(1.95, .028, .06, warm, [0, .785, .388], canopy);
    const interior = new THREE.PointLight('#ffc582', 0, 2.35, 2);
    interior.position.set(0, .075, .19);
    object.add(interior);
    // Brass inlay on the sign fascia suggests a custom wordmark without a third-party brand.
    const letters = [
      [[0,0],[0,.09],[.052,.09],[.052,.042],[0,.042]],
      [[.05,0],[0,0],[0,.09],[.05,.09],[.05,0]],
      [[.052,.09],[0,.09],[0,0],[.052,0],[.052,.043],[.026,.043]],
      [[0,.09],[0,0],[.05,0],[.05,.09]],
      [[.05,.09],[0,.09],[0,0],[.05,0],[0,0],[0,.046],[.04,.046]],
    ];
    letters.forEach((segments, index) => {
      const x = -.226 + index * .101;
      for (let i = 1; i < segments.length; i++) {
        const [ax, ay] = segments[i - 1], [bx, by] = segments[i];
        const stroke = box(Math.hypot(bx - ax, by - ay), .009, .008, gold,
          [x + (ax + bx) / 2, .873 + (ay + by) / 2, .503], canopy);
        stroke.rotation.z = Math.atan2(by - ay, bx - ax);
      }
    });
    const growth = tube([[-.96, -.64, .72], [-.31, -.64, .72], [.33, -.6, .72], [.94, -.46, .7]], .014);
    update = (p, accent) => {
      for (const [part, start, duration] of [[shell, .05, .46], [glazing, .33, .47], [canopy, .51, .46]]) {
        const assembled = phase(p, start, duration);
        part.position.y = -.66 - .09 * (1 - assembled);
        part.scale.y = Math.max(.005, assembled);
        part.visible = assembled > .007;
      }
      warm.emissiveIntensity = .12 + phase(accent, .52, .28) * 1.47;
      interior.intensity = phase(accent, .52, .28) * .52;
      const trace = phase(accent, .68, .3);
      growth.geometry.setDrawRange(0, Math.floor(growth.geometry.index.count * trace / 3) * 3);
      object.rotation.y = -.15 * phase(accent, .78, .22);
    };
  } else {
    throw new Error(`Unknown industry world: ${type}`);
  }

  let disposed = false;
  return {
    object, camera,
    update(progress, time = 0, { accent = progress } = {}) {
      update(THREE.MathUtils.clamp(progress, 0, 1), THREE.MathUtils.clamp(accent, 0, 1));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      object.clear();
    },
  };
}
