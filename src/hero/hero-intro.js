import { gsap } from 'gsap';
import { createIntroAudio } from './hero-intro-audio.js';
import './hero-intro.css';

const sessionKey = 'nexora.brand-intro.v1';

export function createHeroIntro(host, artwork, reduced) {
  // Keep direct links to sections and restored scroll positions unobstructed.
  if (location.hash || window.scrollY > 0 || !('ResizeObserver' in window) ||
      document.documentElement.classList.contains('brand-intro-expired')) return;
  const dialog = document.createElement('dialog');
  if (typeof dialog.showModal !== 'function') return;
  try {
    if (sessionStorage.getItem(sessionKey)) return;
  } catch {
    return; // A blocked storage policy must not replay the intro on every visit.
  }
  const audio = createIntroAudio();

  dialog.className = 'brand-intro';
  dialog.setAttribute('aria-label', 'Nexora introduction');
  dialog.innerHTML = `
    <div class="brand-intro-backdrop" aria-hidden="true"></div>
    <div class="brand-intro-light" aria-hidden="true"></div>
    <div class="brand-intro-ripple" aria-hidden="true"></div>
    <div class="brand-intro-stage"></div>
    <button class="brand-intro-skip" type="button" autofocus>Skip Intro</button>
  `;
  const backdrop = dialog.querySelector('.brand-intro-backdrop');
  const light = dialog.querySelector('.brand-intro-light');
  const stage = dialog.querySelector('.brand-intro-stage');
  const skip = dialog.querySelector('.brand-intro-skip');
  const ripple = dialog.querySelector('.brand-intro-ripple');
  const tagline = artwork.querySelector('.hero-tagline');
  const listeners = new AbortController();
  const { signal } = listeners;
  const progress = { value: 0 };
  const mobile = matchMedia('(max-width: 767.98px)');
  let bounds;
  let sequence;
  let transition;
  let watchdog;
  let active = true;
  let releaseEntrance;
  let resolveFinished;
  const finished = new Promise(resolve => { resolveFinished = resolve; });

  document.body.append(dialog);
  try {
    dialog.showModal();
  } catch {
    dialog.remove();
    audio.dispose();
    return;
  }
  try { sessionStorage.setItem(sessionKey, '1'); } catch { /* Continue once opened. */ }
  document.documentElement.classList.add('brand-intro-open');
  stage.append(artwork);

  function position() {
    const { left, top, centerX, centerY, scaleFrom, scaleTo } = bounds;
    const p = progress.value;
    stage.style.left = mobile.matches ? `${centerX}px` : '';
    stage.style.top = mobile.matches ? `${centerY}px` : '';
    if (mobile.matches) {
      stage.style.transform = p === 0 ? '' :
        `translate3d(${(left - centerX) * p}px, ${(top - centerY) * p}px, 0) scale(${1 + (scaleTo - 1) * p})`;
    } else {
      stage.style.transform = `translate3d(${centerX + (left - centerX) * p}px, ${centerY + (top - centerY) * p}px, 0) scale(${scaleFrom + (scaleTo - scaleFrom) * p})`;
    }
  }

  function measure() {
    const { width, height, left, top } = host.getBoundingClientRect();
    if (!width || !height) return;
    const frame = dialog.getBoundingClientRect();
    const scale = Math.min(1.32, (frame.width - 28) / width, frame.height * .79 / height);
    if (scale <= 0) return;
    // Give mobile artwork its displayed layout size during playback. The handoff
    // reuses that surface until the artwork returns to the Hero.
    stage.style.width = `${width * (mobile.matches ? scale : 1)}px`;
    stage.style.height = `${height * (mobile.matches ? scale : 1)}px`;
    const pixelRatio = window.devicePixelRatio || 1;
    const snap = value => mobile.matches ? Math.round(value * pixelRatio) / pixelRatio : value;
    bounds = {
      left: left - frame.left, top: top - frame.top,
      scaleFrom: mobile.matches ? 1 : scale,
      scaleTo: mobile.matches ? 1 / scale : 1,
      centerX: snap((frame.width - width * scale) / 2),
      centerY: snap((frame.height - height * scale) / 2),
    };
    position();
  }

  const observer = new ResizeObserver(measure);
  observer.observe(host);
  observer.observe(dialog);
  measure();

  function finish(restoreFocus = true) {
    if (!active) return;
    active = false;
    clearTimeout(watchdog);
    sequence?.kill();
    transition?.kill();
    observer.disconnect();
    listeners.abort();
    tagline?.style.removeProperty('opacity');
    tagline?.style.removeProperty('clip-path');
    try {
      host.append(artwork);
    } finally {
      document.documentElement.classList.remove('brand-intro-open');
      dialog.remove();
      resolveFinished();
      document.dispatchEvent(new Event("nexora:intro-finished"));
    }
    releaseEntrance?.();
    audio.dispose();
    if (restoreFocus && document.activeElement === document.body) {
      const link = host.closest('.home-intro')?.querySelector('.hero-actions a');
      link?.focus({ preventScroll: true });
    }
  }

  function handoff(completed = false) {
    if (!completed) {
      try { audio.stop(); } catch { /* Audio must not block the handoff. */ }
    }
    if (!active || transition) return;
    clearTimeout(watchdog);
    sequence?.kill();
    releaseEntrance?.();
    measure();
    const duration = reduced.matches ? .18 : completed ? 1.5 : .85;
    // If the animation clock stalls after handoff starts, release native scrolling.
    watchdog = setTimeout(finish, (duration + .5) * 1000);
    transition = gsap.timeline({ onComplete: () => finish() });
    if (bounds && !reduced.matches) {
      transition.to(progress, {
        value: 1, duration, ease: 'power3.inOut', onUpdate: position,
      }, 0);
    } else {
      transition.to(stage, { opacity: 0, duration }, 0);
    }
    transition.to([backdrop, light, ripple, skip], { opacity: 0, duration, ease: 'power2.inOut' }, 0);
  }

  function run(beginEntrance, entranceDuration) {
    if (!active || transition) { beginEntrance(); return; }
    if (sequence) return;
    releaseEntrance = (speed = 1) => {
      releaseEntrance = undefined;
      beginEntrance(speed);
    };
    clearTimeout(watchdog);
    const entranceStart = .2;
    const impact = 3.65;
    watchdog = setTimeout(() => handoff(), 10000);
    if (tagline) gsap.set(tagline, { opacity: 0, clipPath: 'inset(0 100% 0 0)' });
    sequence = gsap.timeline();
    sequence.call(() => audio.play('opening-whoosh', .28), [], .06);
    sequence.to(light, { opacity: 1, duration: 1.5, ease: 'sine.inOut' }, 0);
    sequence.call(() => releaseEntrance?.(entranceDuration / (impact - entranceStart)), [], entranceStart);
    sequence.call(() => audio.play('deep-water-drop', .62), [], impact);
    sequence.fromTo(ripple, { scale: .25, opacity: .42 }, {
      scale: 1.7, opacity: 0, duration: 1.35, ease: 'power2.out', immediateRender: false,
    }, impact);
    sequence.call(() => audio.play('gold-shimmer', .22), [], 4);
    if (tagline) sequence.to(tagline, {
      opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 1.5, ease: 'sine.inOut',
    }, 4);
    sequence.call(() => {
      audio.play('transition-sweep', .26, 1.5);
      handoff(true);
    }, [], 6.5);
  }

  skip.addEventListener('click', () => handoff(), { signal });
  dialog.addEventListener('cancel', event => { event.preventDefault(); handoff(); }, { signal });
  dialog.addEventListener('close', () => finish(), { signal });
  reduced.addEventListener('change', () => finish(), { signal });
  window.addEventListener('pagehide', () => finish(false), { signal });
  // Escape hatch for a stalled import or renderer. Normal playback uses the scene timeline.
  watchdog = setTimeout(() => handoff(), 4500);
  audio.tryAutoplay();

  return {
    get active() { return active; },
    finished, run,
    runLightweight() {
      run(() => {
        if (!transition) dialog.classList.add('brand-intro-lightweight');
      }, 3.45);
    },
    fail: () => handoff(),
    dispose: () => finish(false),
  };
}
