import { canRenderGraphics, graphicsProfile, watchGraphics } from '../motion/graphics-budget.js';
import { gsap } from 'gsap';
import { INDUSTRY_WORLDS, WORLD_DURATIONS, WORLD_IDLE } from './industry-timing.js';
import './industry-worlds.css';

const previews = {
  architecture: '<path d="m26 97 96-29 101 30-96 25Z" fill="#344251" stroke="#b69c73"/><path d="m41 96 48-14 37 14-49 14Z" fill="#468e9e"/><path d="M69 89V63l43-13 40 15v27l-40 12Z" fill="#776956" stroke="#ccba93"/><path d="M83 86V36l31-11 25 9v55l-25 8Z" fill="#344f64" stroke="#ddc9a5"/><path d="M125 88V20l27-11 29 10v65l-29 12Z" fill="#447084" stroke="#ddc9a5"/><path d="M114 27v69m38-85v85M83 51l31-10 25 8M83 66l31-10 25 8m-56 16 31-9 25 8m-14-44 27-10 29 10m-56 14 27-10 29 10m-56 14 27-10 29 10m-56 18 27-10 29 10" fill="none" stroke="#b99c73" />',
  jewellery: '<ellipse cx="125" cy="102" rx="64" ry="15" fill="#151c30" stroke="#aa8650"/><ellipse cx="124" cy="65" rx="38" ry="28" fill="none" stroke="url(#industry-gold)" stroke-width="10" transform="rotate(-19 124 65)"/><path d="m93 35 10-10 30-2 12 9-19 22-9 2Z" fill="#b9d0dd" stroke="#f6ebd1"/><path d="m103 25 14 31 16-33m-40 12 52-3" fill="none" stroke="#f6ebd1"/><defs><linearGradient id="industry-gold" x2="0" y2="1"><stop stop-color="#6c4926"/><stop offset=".36" stop-color="#f4d28c"/><stop offset=".61" stop-color="#a07135"/><stop offset="1" stop-color="#edc788"/></linearGradient></defs>',
  storefront: '<path d="m25 97 98-27 101 28-97 23Z" fill="#384357" stroke="#b69c73"/><path d="M52 92V46l98-21 47 19v47l-47 13Z" fill="#745b49" stroke="#ceb58c"/><path d="m52 48 98-21v17L52 64Z" fill="#242935" stroke="#d7b782"/><path d="m60 67 80-16v40l-80 12Z" fill="#344a56" stroke="#c8a872"/><path d="m151 45 36 13v34l-36 11ZM88 61v37m25-42v39" fill="none" stroke="#d7b782"/><path d="m75 56 53-11" stroke="#e4c793" stroke-width="2"/>',
};

export function initIndustryWorlds() {
  const section = document.getElementById('industry');
  if (!section) return () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(hover: none), (pointer: coarse)');
  const listeners = new AbortController();
  const { signal } = listeners;
  const states = new Map();
  let active, studio, loading, createStudio, failed;
  let near = false;

  function releaseStudio() {
    studio?.dispose();
    studio = null;
    for (const state of states.values()) state.product = null;
  }
  function failStudio(error) {
    failed = true;
    releaseStudio();
    if (error instanceof Error) console.warn('Industry using the idle previews.', error);
  }
  function permitted() {
    return visibility && resize && canRenderGraphics() && graphicsProfile().level !== 'low';
  }
  function hydrate() {
    if (!near || document.hidden || signal.aborted || reduced.matches || failed || !active?.visible || !permitted()) return;
    if (!createStudio) {
      if (loading) return;
      loading = import('./industry-studio.js').then(({ createIndustryStudio }) => {
        createStudio = createIndustryStudio;
        hydrate();
      }).catch(() => { failed = true; });
      return;
    }
    const state = active;
    if (!state?.visible || state.product) return;
    try {
      studio ??= createStudio(failStudio);
      state.product = studio.add(state.host, state);
    } catch (error) {
      failStudio(error);
    }
  }

  function leave(state, immediate = false) {
    if (active === state) active = undefined;
    state.replay = false;
    state.card.classList.remove('is-world-selected');
    if (immediate) state.timeline.pause(0);
    else state.timeline.timeScale(4.5).reverse();
  }

  function enter(state, replay = false) {
    if (reduced.matches || document.hidden) return;
    if (active === state) {
      if (replay) {
        state.replay = true;
        state.timeline.timeScale(5).reverse();
      }
      return;
    }
    if (active) leave(active);
    active = state;
    state.card.classList.add('is-world-selected');
    hydrate();
    state.timeline.timeScale(1).play();
  }

  function measure() {
    const heights = [];
    for (const { card, host } of states.values()) {
      const heading = card.querySelector('h3');
      heights.push([host, Math.max(0, heading.offsetTop - 20)]);
    }
    for (const [host, height] of heights) {
      host.style.setProperty('--industry-world-height', `${height}px`);
    }
  }
  const resize = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
  const visibility = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target);
      state.visible = entry.isIntersecting;
      if (!state.visible) {
        if (active === state || state.timeline.time() > 0) leave(state, true);
        state.product?.dispose();
        state.product = null;
      }
      state.product?.sync();
    }
    hydrate();
  }) : null;
  const preload = visibility && new IntersectionObserver(([entry]) => {
    near = entry.isIntersecting;
    hydrate();
  }, { rootMargin: '300px 0px' });

  section.querySelectorAll('.industry-card').forEach((card, index) => {
    const type = INDUSTRY_WORLDS[index];
    const heading = card.querySelector('h3');
    if (!type || !heading) return;
    const host = document.createElement('button');
    host.type = 'button';
    host.disabled = reduced.matches;
    host.className = 'industry-world';
    host.setAttribute('aria-label', `Play ${heading.textContent.trim()} animation`);
    host.innerHTML = `<svg viewBox="0 0 250 125" aria-hidden="true" focusable="false">${previews[type]}</svg>`;
    const state = { type, host, card, progress: WORLD_IDLE[type], accent: 0, visible: false };
    state.timeline = gsap.timeline({
      paused: true,
      onUpdate: () => state.product?.sync(),
      onReverseComplete: () => {
        if (state.replay && active === state) {
          state.replay = false;
          state.timeline.timeScale(1).play();
        }
      },
    });
    const duration = WORLD_DURATIONS[type];
    const buildStart = type === 'storefront' ? .52 : 0;
    if (buildStart) state.timeline.to(state, { progress: 0, duration: buildStart, ease: 'power2.inOut' }, 0);
    state.timeline.to(state, { progress: 1, duration: duration - buildStart, ease: 'sine.inOut' }, buildStart);
    state.timeline.to(state, { accent: 1, duration: duration - buildStart, ease: 'none' }, buildStart);
    states.set(card, state);
    heading.before(host);
    resize?.observe(card);
    resize?.observe(heading);
    visibility?.observe(card);
    card.addEventListener('pointerenter', event => {
      if (!touch.matches && event.pointerType === 'mouse') enter(state);
    }, { signal });
    card.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && active === state) leave(state);
    }, { signal });
    card.addEventListener('pointercancel', () => { if (active === state) leave(state); }, { signal });
    host.addEventListener('click', event => {
      if (touch.matches || event.detail === 0 || event.pointerType === 'touch') enter(state, true);
    }, { signal });
  });

  const unwatch = watchGraphics(() => { if (!permitted()) releaseStudio(); });
  document.addEventListener('nexora:intro-finished', hydrate, { signal });
  if (!resize) {
    measure();
    window.addEventListener('resize', measure, { signal });
  }
  preload?.observe(section);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && active) leave(active, true);
    else hydrate();
  }, { signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) leave(active);
  }, { signal });
  reduced.addEventListener('change', () => {
    for (const state of states.values()) {
      state.host.disabled = reduced.matches;
      leave(state, true);
    }
    if (reduced.matches) {
      studio?.dispose();
      studio = null;
      for (const state of states.values()) state.product = null;
    } else hydrate();
  }, { signal });

  return () => {
    unwatch();
    listeners.abort();
    preload?.disconnect();
    visibility?.disconnect();
    resize?.disconnect();
    studio?.dispose();
    for (const { card, host, timeline } of states.values()) {
      timeline.kill();
      host.remove();
      card.classList.remove('is-world-selected');
    }
  };
}
