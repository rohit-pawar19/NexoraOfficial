const profiles = {
  high: { level: 'high', dpr: 2, fps: 60, antialias: true, environment: 256, shadows: 512, cardWidth: 640, transmission: .65 },
  medium: { level: 'medium', dpr: 1.25, fps: 40, antialias: false, environment: 128, shadows: 256, cardWidth: 384, transmission: .4 },
  low: { level: 'low', dpr: .85, fps: 24, antialias: false, environment: 64, shadows: 0, cardWidth: 288, transmission: .25 },
};
const changes = new EventTarget();
let level;
let exhausted = false;

function detect() {
  const canvas = document.createElement('canvas');
  let gl;
  try {
    gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return 'static';
    const texture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const pixels = innerWidth * innerHeight * (devicePixelRatio || 1) ** 2;
    const { deviceMemory, hardwareConcurrency, connection } = navigator;
    if (texture < 4096 || deviceMemory <= 2 || hardwareConcurrency <= 2 || connection?.saveData) return 'low';
    if (texture < 8192 || deviceMemory <= 4 || hardwareConcurrency <= 4 ||
        (pixels > 4_000_000 && !(deviceMemory >= 8 && hardwareConcurrency >= 8))) return 'medium';
    return 'high';
  } catch {
    return 'static';
  } finally {
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

export function graphicsProfile() {
  level ??= detect();
  return profiles[level];
}

export function canRenderGraphics() {
  return !exhausted && !document.documentElement.classList.contains('brand-intro-open') && Boolean(graphicsProfile());
}

export function watchGraphics(listener) {
  changes.addEventListener('change', listener);
  return () => changes.removeEventListener('change', listener);
}

// Sample display callbacks before throttling draws. Two populated two-second
// windows prevent a single shader compile, resize, or scroll hitch from switching tiers.
export function createGraphicsMonitor() {
  let previous, started, samples, slow, streak, observedLevel;
  function reset() {
    previous = started = undefined;
    samples = slow = streak = 0;
  }
  reset();
  return {
    reset,
    sample(now) {
      if (exhausted) return;
      if (observedLevel !== level || (previous !== undefined && now - previous > 1500)) {
        reset();
        observedLevel = level;
      }
      if (previous !== undefined) {
        samples++;
        if (now - previous > 28) slow++;
      }
      started ??= now;
      previous = now;
      if (now - started < 2000) return;
      streak = samples >= 2 && slow / samples >= .35 ? streak + 1 : 0;
      samples = slow = 0;
      started = now;
      if (streak < 2) return;
      if (level === 'high') level = 'medium';
      else if (level === 'medium') level = 'low';
      else exhausted = true;
      queueMicrotask(() => changes.dispatchEvent(new Event('change')));
    },
  };
}

export function graphicsExhausted() {
  return exhausted;
}

export function guardGraphics(renderer, fail) {
  const canvas = renderer.domElement;
  canvas.addEventListener('webglcontextlost', fail);
  return () => canvas.removeEventListener('webglcontextlost', fail);
}
