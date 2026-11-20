import * as THREE from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { addTaglineEntrance } from './hero-tagline.js';
import { fitRibbonVertices } from './hero-framing.js';
import { useConstrainedGraphics } from '../motion/graphics-budget.js';

gsap.registerPlugin(ScrollTrigger);

// A continuous, bevelled metal strip: the depth at the crossing separates the loops.
export function createRibbonGeometry(segments, strand) {
  const positions = [], indices = [], colors = [];
  const antique = new THREE.Color('#8C641B');
  const rich = new THREE.Color('#B8860B');
  const gold = new THREE.Color('#D4AF37');
  const champagne = new THREE.Color('#F5D778');
  const tint = new THREE.Color();
  const point = (t) => new THREE.Vector3(
    2.18 * Math.sin(t),
    0.88 * Math.sin(2 * t) + (strand - 1) * 0.12,
    0.53 * Math.cos(t) + (strand - 1) * 0.105,
  );
  const profile = [[-1, -.45], [-.88, -1], [.88, -1], [1, -.45], [1, .45], [.88, 1], [-.88, 1], [-1, .45]];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments * Math.PI * 2;
    const center = point(t);
    const tangent = point(t + .001).sub(point(t - .001)).normalize();
    const side = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, side).normalize();
    const twist = .42 * Math.sin(t + strand * .22);
    side.applyAxisAngle(tangent, twist);
    normal.applyAxisAngle(tangent, twist);
    const width = (.115 + .035 * Math.cos(t * 2)) * (strand === 1 ? 1 : .65);
    for (const [u, v] of profile) {
      const vertex = center.clone().addScaledVector(side, u * width).addScaledVector(normal, v * .014);
      positions.push(vertex.x, vertex.y, vertex.z);
      // Dark bevels and recesses, a warm face, and restrained champagne edges.
      // Colors are linearized by THREE.Color; reflections supply the white highlights.
      const edge = Math.pow(Math.abs(u), 6);
      tint.copy(gold).lerp(champagne, .14 + .12 * Math.sin(t) ** 2);
      tint.lerp(v < 0 ? antique : rich, edge * (v < 0 ? .58 : .28));
      colors.push(tint.r, tint.g, tint.b);
    }
    if (i < segments) for (let j = 0; j < 8; j++) {
      const a = i * 8 + j, b = i * 8 + (j + 1) % 8;
      indices.push(a, b, a + 8, b, b + 8, a + 8);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function initHero({ hero, host: layoutHost, artwork: host, intro }) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let teardown = () => {};

  function start() {
    const staticPose = preference.matches;
    if (staticPose && !intro?.active) return;
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const constrained = useConstrainedGraphics();
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !constrained, powerPreference: 'low-power' });
    } catch {
      host.classList.remove('ribbon-pending');
      intro?.fail();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, constrained ? 1.2 : 1.65));
    renderer.setClearColor(0x06123c, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.classList.add('ribbon-pending');
    host.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
    const sculpture = new THREE.Group();
    scene.add(sculpture);
    const pmrem = new THREE.PMREMGenerator(renderer);
    // A contrast-controlled jewellery studio: amber shadow reflections between
    // white softboxes reproduce the original logo's dark-to-champagne gradients.
    // The baked map is generated once; no external HDR download or per-frame PMREM.
    const room = new THREE.Scene();
    // Linear radiance, independent of the visible royal-blue hero background.
    // Nonzero warm radiance gives unlit directions deep gold rather than black.
    room.background = new THREE.Color().setRGB(.18, .14, .075);
    const panels = [];
    const panel = (width, height, position, intensity, color = 0xffffff) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      mesh.material.color.multiplyScalar(intensity);
      mesh.position.set(...position);
      mesh.lookAt(0, 0, 0);
      room.add(mesh);
      panels.push(mesh);
    };
    panel(11, 8, [0, 0, 7], .46); // Gold midtones across the front.
    panel(3, 6, [-4, 3, 5], 2.5); // Selective broad white key.
    panel(1.2, 5, [-3.8, 2.8, 4.8], 4); // Champagne core with softened edges.
    panel(5, 6, [5, 0, 2], .65, 0xffedc6); // Warm metallic side reflection.
    panel(7, 4, [0, -4, 2], .32, 0xfff3dd); // Restrained lower fill.
    panel(5, 2, [0, 5, -2], 1.8); // Curved upper highlight.
    panel(6, 5, [0, 0, -6], .4, 0xffefcf); // Rich gold reverse faces.
    panel(5, 6, [-6, -1, -1], .38, 0xffefcf);
    panel(.38, 6, [3, 1, 4], 5.5); // Small near-white specular reflections.
    panel(.3, 4, [-3, 0, -4], 3.5); // Narrow rim, without a glowing outline.
    // Dark reflection cards break up the broad fill; these are lit warm gray,
    // never black. Their reflections follow the surface normals as it moves.
    panel(1.4, 7, [1.4, -.3, 5], .22, 0xffe4ad);
    panel(2, 4, [-2, -2, -4], .2, 0xffe4ad);
    const environment = pmrem.fromScene(room, .025, .1, 100, { size: constrained ? 128 : 256 });
    scene.environment = environment.texture;
    panels.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
    pmrem.dispose();
    const material = new THREE.MeshPhysicalMaterial({
      // Reflected studio light supplies depth; baked dark tints would blacken bevels.
      color: '#D4AF37', vertexColors: false, metalness: 1, roughness: .15,
      clearcoat: 0, envMapIntensity: 1.45, flatShading: false,
    });
    const wave = { time: { value: 0 }, amount: { value: 0 } };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.ribbonTime = wave.time;
      shader.uniforms.ribbonWave = wave.amount;
      shader.vertexShader = `uniform float ribbonTime;\nuniform float ribbonWave;\n${shader.vertexShader}`
        .replace('#include <beginnormal_vertex>', `
          #include <beginnormal_vertex>
          float phase = position.x * 1.8 + ribbonTime;
          objectNormal.x -= ribbonWave * (1.8 * cos(phase) * objectNormal.y
            - 1.35 * sin(phase * .75) * objectNormal.z * .6);
          objectNormal = normalize(objectNormal);
        `)
        .replace('#include <begin_vertex>', `
          #include <begin_vertex>
          transformed.y += ribbonWave * sin(position.x * 1.8 + ribbonTime);
          transformed.z += ribbonWave * .6 * cos((position.x * 1.8 + ribbonTime) * .75);
        `);
    };
    const key = new THREE.DirectionalLight(0xfffaf0, .75);
    key.position.set(-3, 4, 5);
    const rim = new THREE.DirectionalLight(0xffedce, .45);
    rim.position.set(4, -1, -3);
    const fill = new THREE.DirectionalLight(0xfff1db, .25);
    fill.position.set(4, 1, 5);
    scene.add(key, rim, fill);
    const ribbons = Array.from({ length: mobile ? 2 : 3 }, (_, i) => {
      const geometry = createRibbonGeometry(mobile ? 160 : constrained ? 220 : 320, i);
      // Each frustum constraint is linear in the ribbon's vertices. Its
      // maximum is on the hull, so interior points cannot affect the framing.
      const positions = geometry.getAttribute('position');
      const points = Array.from({ length: positions.count }, (_, index) =>
        new THREE.Vector3().fromBufferAttribute(positions, index));
      const hullPoints = new Set();
      for (const face of new ConvexHull().setFromPoints(points).faces) {
        let edge = face.edge;
        do {
          hullPoints.add(edge.head().point);
          edge = edge.next;
        } while (edge !== face.edge);
      }
      const framingPositions = new Float32Array(hullPoints.size * 3);
      let offset = 0;
      for (const point of hullPoints) {
        point.toArray(framingPositions, offset);
        offset += 3;
      }
      geometry.setDrawRange(0, 0);
      const mesh = new THREE.Mesh(geometry, material);
      sculpture.add(mesh);
      return { mesh, framingPositions, progress: 0, count: geometry.index.count };
    });
    const motion = { scroll: 0, entrance: 0 };
    const basePose = new THREE.Quaternion().setFromEuler(new THREE.Euler(.08, -.12, -.09));
    const turnPose = new THREE.Quaternion();
    const verticalAxis = new THREE.Vector3(0, 1, 0);
    const turnSpeed = Math.PI * 2 / 18;
    let turnAngle = 0, viewportWidth = 0, viewportHeight = 0, artworkBottom = 1;
    let baseDistance = 8.7;
    // Project the real ribbon at its settled pose to exclude canvas whitespace.
    // A fixed anchor keeps the tagline stable during floating and rotation.
    const framingCamera = camera.clone();
    const settledPose = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.08, -.12, -.09));
    const projected = new THREE.Vector3();
    function positionTagline(width, height) {
      framingCamera.aspect = width / height;
      framingCamera.updateProjectionMatrix();
      framingCamera.position.set(0, .15, baseDistance);
      framingCamera.lookAt(0, 0, 0);
      framingCamera.updateMatrixWorld(true);
      let bottom = 0;
      for (const { framingPositions } of ribbons) {
        for (let i = 0; i < framingPositions.length; i += 3) {
          projected.fromArray(framingPositions, i).applyMatrix4(settledPose).project(framingCamera);
          bottom = Math.max(bottom, (1 - projected.y) * height / 2);
        }
      }
      const gap = window.matchMedia('(max-width: 767.98px)').matches ? 10 : 16;
      host.style.setProperty('--tagline-top', `${bottom + gap}px`);
      artworkBottom = bottom;
    }
    function resize() {
      const { width, height } = layoutHost.getBoundingClientRect();
      if (!width || !height) return;
      viewportWidth = width; viewportHeight = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      baseDistance = Math.max(8.1, 3.05 / (Math.tan(THREE.MathUtils.degToRad(18)) * camera.aspect));
      renderer.setSize(width, height, false);
      positionTagline(width, height);
    }
    resize();
    let entranceTimeline;
    const context = gsap.context(() => {
      const sequence = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      entranceTimeline = sequence;
      ribbons.forEach((ribbon, i) => {
        sequence.to(ribbon, { progress: 1, duration: 2.3, ease: 'power2.inOut' }, i * .18);
        sequence.fromTo(ribbon.mesh.rotation, { z: -.16 + i * .035 }, { z: 0, duration: 2.6 }, i * .18);
      });
      sequence.to(motion, { entrance: 1, duration: 2.96, ease: 'power2.inOut' }, 0);
      // Includes the final strand settling and the camera entrance: 2.96 seconds.
      addTaglineEntrance(sequence, host, sequence.duration());
      if (!staticPose) gsap.to(motion, { scroll: 1, ease: 'none', scrollTrigger: {
        trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.2,
      } });
    }, hero);
    const viewInverse = new THREE.Quaternion();
    const fitRotation = new THREE.Quaternion();
    const fitMatrix = new THREE.Matrix4();
    const fitBasis = new THREE.Matrix3();
    const fitOffset = new THREE.Vector3();
    const tanY = Math.tan(THREE.MathUtils.degToRad(18));
    let fittedDistance = baseDistance;
    function fitRotatedSculpture(delta) {
      // Fit the turned sculpture above the fixed tagline, including its depth.
      // Move out immediately to avoid clipping; ease back in after a tall pose.
      viewInverse.copy(camera.quaternion).invert();
      const tanX = tanY * camera.aspect * Math.max(.1, 1 - 16 / viewportWidth);
      const topTan = tanY * Math.max(.1, 1 - 16 / viewportHeight);
      const bottomTan = tanY * Math.max(.1, 2 * artworkBottom / viewportHeight - 1);
      let required = camera.position.length();
      fitOffset.copy(sculpture.position).applyQuaternion(viewInverse);
      for (const { mesh, framingPositions } of ribbons) {
        fitRotation.copy(viewInverse).multiply(sculpture.quaternion).multiply(mesh.quaternion);
        fitBasis.setFromMatrix4(fitMatrix.makeRotationFromQuaternion(fitRotation));
        required = fitRibbonVertices(framingPositions, fitBasis.elements, fitOffset,
          tanX, topTan, bottomTan, required);
      }
      fittedDistance = required > fittedDistance ? required
        : THREE.MathUtils.lerp(fittedDistance, required, 1 - Math.exp(-delta * 3));
      camera.position.setLength(fittedDistance);
    }
    let frame = 0, visible = true, previous = 0, elapsed = 0, ready = false;
    let entranceReleased = !intro?.active;
    function render(now) {
      frame = staticPose ? 0 : requestAnimationFrame(render);
      if (!viewportWidth || !viewportHeight) return;
      if (!staticPose && now - previous < (constrained ? 1000 / 30 - 1 : 16)) return;
      const delta = Math.min((now - previous) / 1000, .05);
      previous = now;
      elapsed += delta;
      for (const ribbon of ribbons) {
        const count = Math.floor(ribbon.count * ribbon.progress / 6) * 6;
        if (count !== ribbon.mesh.geometry.drawRange.count) ribbon.mesh.geometry.setDrawRange(0, count);
      }
      // All loops share the visibility-paused clock, independent of the entrance timeline.
      // Fade their amplitudes in continuously so completing the entrance never resets a pose.
      const idle = staticPose ? 0 : motion.entrance * motion.entrance;
      const movement = mobile ? .55 : 1;
      // Start the turntable after the shared entrance; never wrap or reverse its
      // angle. The existing visibility-paused render clock drives all motion.
      if (!staticPose && motion.entrance === 1) turnAngle += delta * turnSpeed;
      turnPose.setFromAxisAngle(verticalAxis, turnAngle);
      sculpture.quaternion.copy(turnPose).multiply(basePose);
      sculpture.position.y = Math.sin(elapsed * Math.PI * 2 / 4.8) * .05 * idle * movement;
      wave.time.value = elapsed * Math.PI * 2 / 7;
      wave.amount.value = .018 * idle * movement;
      // Shift actual studio reflections rather than painting an emissive band on the gold.
      scene.environmentRotation.y = Math.sin(elapsed * Math.PI * 2 / 6.5) * .24 * idle;
      scene.environmentRotation.z = Math.sin(elapsed * Math.PI * 2 / 6.5) * .045 * idle;
      camera.position.set(.3 * (1 - motion.entrance) + motion.scroll * .35, .15 + motion.scroll * .3, baseDistance + (1 - motion.entrance) * 1.3 + motion.scroll * 1.15);
      camera.lookAt(0, 0, 0);
      fitRotatedSculpture(delta);
      renderer.render(scene, camera);
      if (!ready && ribbons.some(({ mesh }) => mesh.geometry.drawRange.count > 0)
          && !renderer.getContext().isContextLost()) {
        ready = true;
        host.classList.replace('ribbon-pending', 'ribbon-ready');
        intro?.firstFrame();
      }
    }
    function playback() {
      cancelAnimationFrame(frame);
      const playing = entranceReleased && (visible || intro?.active) && !document.hidden;
      if (playing) { previous = performance.now(); frame = requestAnimationFrame(render); }
      entranceTimeline.paused(staticPose || !playing);
    }
    function beginEntrance(speed = 1) {
      entranceReleased = true;
      entranceTimeline.timeScale(speed);
      if (staticPose) entranceTimeline.progress(1);
      playback();
    }
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (staticPose && entranceReleased) playback();
    });
    resizeObserver.observe(layoutHost);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; playback(); });
    observer.observe(hero);
    document.addEventListener('visibilitychange', playback);
    const lost = () => { teardown(); intro?.fail(); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    teardown = () => {
      cancelAnimationFrame(frame);
      context.revert();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', playback);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      ribbons.forEach(({ mesh }) => mesh.geometry.dispose());
      material.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      host.classList.remove('ribbon-pending', 'ribbon-ready');
      host.style.removeProperty('--tagline-top');
      teardown = () => {};
    };
    if (intro?.active) intro.run(beginEntrance, entranceTimeline.duration());
    else playback();
  }
  const change = () => { teardown(); start(); };
  preference.addEventListener('change', change);
  start();
  return () => { teardown(); preference.removeEventListener('change', change); };
}
