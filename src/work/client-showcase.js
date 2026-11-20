import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './client-showcase.css';

gsap.registerPlugin(ScrollTrigger);

const directions = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];
const launchTimes = [0, .08, .035, .13, .055, .17, .105, .195, .245, .315, .275, .36];

function createEntrance(heading, description, viewport, cards, onComplete) {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  const clearance = Math.max(width, height) * .14 + 24;
  const alignAt = 2.4;
  const settleAt = 2.8;

  const origins = cards.map((card, index) => {
    const [horizontal, vertical] = directions[index % directions.length];
    const x = horizontal < 0
      ? -card.offsetLeft - card.offsetWidth - clearance
      : width - card.offsetLeft + clearance;
    const y = vertical < 0
      ? -card.offsetTop - card.offsetHeight - clearance
      : height - card.offsetTop + clearance;
    return { horizontal, vertical, x: horizontal ? x : 0, y: vertical ? y : 0 };
  });

  const timeline = gsap.timeline({ paused: true, onComplete });
  timeline
    .from(heading, { x: -22, rotationY: -11, transformPerspective: 800, opacity: 0, duration: .72, ease: 'power3.out', clearProps: 'transform,opacity' })
    .from(description, { y: 9, opacity: 0, duration: .56, ease: 'power2.out', clearProps: 'transform,opacity' }, .18);

  cards.forEach((card, index) => {
    const { horizontal, vertical, x, y } = origins[index];
    const delay = launchTimes[index % launchTimes.length];
    timeline
      .set(card, {
        x, y, z: -96, scale: .82,
        rotationX: vertical * 13, rotationY: -horizontal * 17,
        transformPerspective: 1000, opacity: 0,
      }, 0)
      .to(card, {
        x: horizontal * 4, y: vertical * 4, z: -9, scale: .985,
        rotationX: vertical * 2, rotationY: -horizontal * 2,
        duration: alignAt - delay,
        ease: 'power2.out',
      }, delay)
      .to(card, { opacity: 1, duration: .85, ease: 'power2.out' }, delay)
      .to(card, {
        x: 0, y: 0, z: 0, scale: 1, rotationX: 0, rotationY: 0,
        duration: settleAt - alignAt, ease: 'sine.out', clearProps: 'transform,opacity',
      }, alignAt);
  });

  timeline.to({}, { duration: .3 }, settleAt);
  return timeline;
}

export function initClientShowcase() {
  const section = document.querySelector('.portfolio-clients');
  if (!section) return () => {};

  const heading = section.querySelector('h2');
  const description = section.querySelector('.portfolio-heading p:last-child');
  const viewport = section.querySelector('.client-logo-viewport');
  const track = section.querySelector('.client-logo-track');
  const grid = track.firstElementChild;
  const cards = [...grid.children];
  const media = gsap.matchMedia();
  let entered = false;

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const listeners = new AbortController();
    const { signal } = listeners;
    const repeatedGrid = grid.cloneNode(true);
    repeatedGrid.setAttribute('aria-hidden', 'true');
    repeatedGrid.querySelectorAll('img').forEach(image => { image.alt = ''; });
    track.append(repeatedGrid);
    section.classList.add('client-motion');
    viewport.tabIndex = 0;

    const phase = { value: 0 };
    const wrap = gsap.utils.wrap(0, 1);
    const setPosition = gsap.quickSetter(track, 'xPercent');
    let width = 0;
    let visible = false;
    let ready = entered;
    let hovering = false;
    let focused = false;
    let playing = false;
    let drag;
    let entrance;

    function render() {
      setPosition(-50 * wrap(phase.value));
    }

    function measure() {
      width = grid.getBoundingClientRect().width;
      syncLoop();
    }

    function tick(_, milliseconds) {
      phase.value = wrap(phase.value + Math.min(milliseconds, 48) * 0.022 / width);
      render();
    }

    function syncLoop() {
      const shouldPlay = ready && visible && !document.hidden && !hovering && !focused && !drag && width > 0;
      if (shouldPlay === playing) return;
      playing = shouldPlay;
      section.classList.toggle('client-loop-playing', playing);
      if (playing) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    }

    const resize = new ResizeObserver(measure);
    resize.observe(grid);
    measure();

    function startEntrance() {
      if (ready || entrance) return;
      entrance = createEntrance(heading, description, viewport, cards, () => {
        entered = true;
        ready = true;
        section.classList.add('client-loop-ready');
        syncLoop();
      });
      entrance.eventCallback('onStart', () => section.classList.add('client-entered')).play();
    }

    function updatePresence({ isActive }) {
      visible = isActive;
      if (visible) startEntrance();
      syncLoop();
    }

    if (ready) section.classList.add('client-entered', 'client-loop-ready');
    const presence = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: updatePresence,
      onRefresh: updatePresence,
    });
    updatePresence(presence);
    document.addEventListener('visibilitychange', syncLoop, { signal });

    viewport.addEventListener('pointerenter', (event) => {
      hovering = event.pointerType === 'mouse';
      syncLoop();
    }, { signal });
    viewport.addEventListener('pointerleave', () => {
      hovering = false;
      syncLoop();
    }, { signal });
    viewport.addEventListener('focus', () => {
      focused = viewport.matches(':focus-visible');
      syncLoop();
    }, { signal });
    viewport.addEventListener('blur', () => {
      focused = false;
      syncLoop();
    }, { signal });

    viewport.addEventListener('pointerdown', (event) => {
      if (!ready || event.pointerType === 'mouse' || !event.isPrimary) return;
      drag = { id: event.pointerId, x: event.clientX, phase: phase.value };
      viewport.setPointerCapture(event.pointerId);
      syncLoop();
    }, { signal });
    viewport.addEventListener('pointermove', (event) => {
      if (event.pointerId !== drag?.id || !width) return;
      if (Math.abs(event.clientX - drag.x) < 4 && !drag.moving) return;
      drag.moving = true;
      phase.value = wrap(drag.phase + (drag.x - event.clientX) / width);
      render();
    }, { signal });
    viewport.addEventListener('lostpointercapture', (event) => {
      if (event.pointerId === drag?.id) {
        drag = undefined;
        syncLoop();
      }
    }, { signal });

    return () => {
      listeners.abort();
      resize.disconnect();
      presence.kill();
      entrance?.revert();
      gsap.ticker.remove(tick);
      gsap.set(track, { clearProps: 'transform' });
      repeatedGrid.remove();
      viewport.removeAttribute('tabindex');
      section.classList.remove('client-motion', 'client-entered', 'client-loop-ready', 'client-loop-playing');
    };
  });

  return () => media.revert();
}
