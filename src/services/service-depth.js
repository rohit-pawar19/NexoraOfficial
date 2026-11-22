import { canRenderGraphics, graphicsProfile, watchGraphics } from '../motion/graphics-budget.js';
import { gsap } from 'gsap';
import { createServiceEntrance, SERVICE_TIMING } from './service-timing.js';
import { createServiceCardMotion } from './service-card-motion.js';
import './service-depth.css';

const pieces = (className, count) => Array.from({ length: count }, () => `<i class="${className}"></i>`).join('');
const designs = {
  'Branding & Creative': ['brand', pieces('brand-shape', 3)],
  'Photography & Videography': ['lens', `<i class="lens-body"><i class="lens-ring"></i><i class="lens-iris">${pieces('lens-blade', 6)}</i></i>`],
  'Real Estate & Builder Marketing': ['building', '<i class="blueprint"></i><i class="tower"></i><i class="tower-side"></i>'],
  'Jewellery Brand Marketing': ['gem', '<i class="gem-fallback"></i>'],
  'Printing & Production': ['paper', pieces('paper-sheet', 3)],
  'Digital Marketing': ['network', pieces('network-link', 3) + pieces('network-node', 4)],
  'Website Services': ['browser', '<i class="browser-frame"></i><i class="browser-bar"></i><i class="browser-hero"></i>' + pieces('browser-tile', 2)],
  'Event & Launch Marketing': ['stage', '<i class="stage-floor"></i>' + pieces('stage-wing', 2) + '<i class="stage-light"></i>'],
};

function animateMiniature(object, type) {
  const q = selector => object.querySelectorAll(selector);
  const timeline = gsap.timeline({ defaults: { duration: .95, ease: 'power2.inOut' } });
  switch (type) {
    case 'brand':
      timeline.fromTo(q('i'), { x: i => [-30, 30, 0][i], y: i => [12, 12, -24][i], z: i => i * 15, opacity: .2 },
        { x: i => [-17, 17, 0][i], y: 0, z: 0, opacity: 1, stagger: .12 });
      break;
    case 'lens':
      gsap.set(q('.lens-blade'), { rotation: i => i * 60 });
      timeline.fromTo(q('.lens-ring'), { rotation: -35 }, { rotation: 35 }, 0);
      timeline.fromTo(q('.lens-blade'), { rotation: i => i * 60, scale: 1.15 },
        { rotation: i => i * 60 + 24, scale: .72, stagger: .025 }, 0);
      break;
    case 'building':
      timeline.fromTo(q('.blueprint'), { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .5 }, 0);
      timeline.fromTo(q('.tower, .tower-side'), { scaleY: .02, opacity: 0 }, { scaleY: 1, opacity: 1, stagger: .08 }, .2);
      break;
    case 'gem':
      timeline.fromTo(q('.gem-fallback'), { rotationY: -30 }, { rotationY: 30, duration: 1.8 });
      break;
    case 'paper':
      timeline.fromTo(q('i'), { rotationY: i => -75 + i * 10, x: i => i * 9, z: i => i * 12 },
        { rotationY: 0, x: i => i * 3, y: i => -i * 3, z: i => i * 3, stagger: .15 });
      break;
    case 'network':
      timeline.fromTo(q('.network-node'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, stagger: .12, duration: .5 }, 0);
      timeline.fromTo(q('.network-link'), { scaleX: 0 }, { scaleX: 1, stagger: .15 }, .15);
      break;
    case 'browser':
      timeline.fromTo(q('i'), { z: i => 60 + i * 12, y: i => -15 + i * 5, opacity: 0 },
        { z: 0, y: 0, opacity: 1, stagger: .12 });
      break;
    case 'stage':
      timeline.fromTo(q('.stage-wing'), { rotationY: 0 }, { rotationY: i => i ? 65 : -65 }, 0);
      timeline.fromTo(q('.stage-floor'), { scaleX: .6 }, { scaleX: 1 }, 0);
      timeline.fromTo(q('.stage-light'), { opacity: 0, rotation: -10 }, { opacity: .85, rotation: 6, duration: 1.4 }, .35);
      break;
  }
  return timeline;
}

// Light CSS choreography is retained as the touch/WebGL fallback.
function createIdle(object, type) {
  const q = selector => object.querySelectorAll(selector);
  const tl = gsap.timeline({ repeat: -1, yoyo: true, paused: true, defaults: { ease: 'sine.inOut' } });
  switch (type) {
    case 'brand': tl.to(q('.brand-shape'), { z: i => i * 4, duration: 3, stagger: .15 }); break;
    case 'lens': tl.to(q('.lens-ring'), { rotation: 8, duration: 4 }); break;
    case 'building': tl.to(q('.tower'), { opacity: .82, duration: 3.5 }); break;
    case 'gem': tl.to(q('.gem-fallback'), { rotationY: 16, duration: 4.5 }); break;
    case 'paper': tl.to(q('.paper-sheet'), { rotationY: i => i * 2, duration: 4 }); break;
    case 'network': tl.to(q('.network-node'), { opacity: .66, stagger: .3, duration: 2.5 }); break;
    case 'browser': tl.to(q('.browser-hero'), { opacity: .76, duration: 4 }); break;
    case 'stage': tl.to(q('.stage-light'), { rotation: 5, opacity: .55, duration: 4.5 }); break;
  }
  return tl;
}

export function initServiceDepth() {
  const cards = [...document.querySelectorAll('.services-page .service-card')]
    .filter(card => designs[card.dataset.service] && card.querySelector('.service-image'));
  if (!cards.length || !('ResizeObserver' in window)) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cardMotion = createServiceCardMotion(cards, reduced, fine);
  const states = new Map(), removers = [];
  let active = null, disposed = false, studio = null, loading = null, studioFailed = false;
  let pointerFrame = 0, pointerX = 0, pointerY = 0;
  const listen = (target, name, fn, options) => {
    target.addEventListener(name, fn, options);
    removers.push(() => target.removeEventListener(name, fn, options));
  };
  function releaseProduct(state) {
    state.product?.dispose(); state.product = null;
  }
  function permitted() {
    return 'ResizeObserver' in window && canRenderGraphics() && graphicsProfile().level !== 'low';
  }
  function failStudio(error) {
    studioFailed = true;
    studio?.dispose();
    studio = null;
    for (const state of states.values()) state.product = null;
    if (error instanceof Error) console.warn('Services using lightweight miniatures.', error);
  }
  function attachProduct(card) {
    const state = states.get(card);
    if (disposed || active !== card || !state.visible || document.hidden || reduced.matches || studioFailed || !permitted()) return;
    if (studio) {
      if (!state.product) {
        try { state.product = studio.add(state.visual, state.type, state.motion); }
        catch (error) { failStudio(error); }
      }
      return;
    }
    if (loading) return;
    // Import and allocate a GPU context only after an actual card activation.
    loading = import('./service-studio.js').then(({ createServiceStudio }) => {
      loading = null;
      if (disposed || !states.get(active)?.visible || document.hidden || reduced.matches || !permitted()) return;
      studio = createServiceStudio(failStudio);
      attachProduct(active);
    }).catch(error => {
      loading = null; failStudio(error);
    });
  }
  function deactivate(immediate = false) {
    if (!active) return;
    const card = active, state = states.get(card);
    active = null;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    state.entrance?.kill(); state.fallback?.kill(); state.idle?.kill();
    state.exit?.kill();
    // Freeze the last rendered frame during the CSS fade. Only the next hovered
    // product can render, even when users move rapidly between cards.
    state.product?.visible(false);
    card.classList.remove('is-exploring');
    const seconds = immediate || reduced.matches ? 0 : SERVICE_TIMING.exit;
    cardMotion.leave(card, seconds);
    gsap.to(state.motion.pointer, { x: 0, y: 0, duration: seconds, overwrite: true });
    gsap.to(state.image, { z: 0, duration: seconds, overwrite: true });
    card.style.removeProperty('--light-x'); card.style.removeProperty('--light-y');
    state.exit = gsap.to(state.visual, { autoAlpha: 0, scale: .96, '--mini-sweep-opacity': 0,
      duration: seconds, ease: 'power2.inOut', overwrite: true,
      onComplete: () => { releaseProduct(state); },
    });
  }
  function activate(card) {
    if (active === card || reduced.matches || document.hidden || disposed) return;
    deactivate();
    active = card;
    const state = states.get(card);
    state.visible = true; // A pointer/focus activation can precede the observer callback.
    state.exit?.kill(); state.entrance?.kill(); state.fallback?.kill(); state.idle?.kill();
    releaseProduct(state);
    gsap.killTweensOf(state.motion);
    Object.assign(state.motion, { hover: 0, reveal: 0, assembly: 0 });
    card.classList.add('is-exploring');
    cardMotion.enter(card);
    state.entrance = createServiceEntrance(card, state, () => {
      if (active === card && !state.product) state.idle = createIdle(state.object, state.type).play();
    });
    // The fallback shares the same 0.8–2.5-second assembly window. It is hidden
    // automatically when the physically rendered product produces its first frame.
    state.fallback = animateMiniature(state.object, state.type).duration(1.7);
    state.entrance.add(state.fallback, SERVICE_TIMING.revealEnd);
    gsap.to(state.image, { z: state.type === 'lens' ? 12 : 8, duration: .8, ease: 'power2.inOut', overwrite: true });
    attachProduct(card);
    state.entrance.play(0);
  }
  function movePointer() {
    pointerFrame = 0;
    if (!active || document.hidden) return;
    const card = active;
    const state = states.get(card);
    const box = card.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = gsap.utils.clamp(-.5, .5, (pointerX - box.left) / box.width - .5);
    const y = gsap.utils.clamp(-.5, .5, (pointerY - box.top) / box.height - .5);
    card.style.setProperty('--light-x', `${(x + .5) * 100}%`);
    card.style.setProperty('--light-y', `${(y + .5) * 100}%`);
    gsap.to(state.motion.pointer, { x: x * 2, y: y * 2, duration: .65, ease: 'power3.out', overwrite: true });
    cardMotion.move(card, x, y);
  }
  for (const card of cards) {
    const image = card.querySelector('.service-image');
    const [type, html] = designs[card.dataset.service];
    const visual = document.createElement('div');
    visual.className = 'service-miniature'; visual.setAttribute('aria-hidden', 'true');
    visual.innerHTML = `<div class="mini-object mini-${type}">${html}</div>`;
    image.append(visual); card.classList.add('service-depth');
    const state = { visual, image, object: visual.firstElementChild, type, visible: false,
      motion: { hover: 0, reveal: 0, assembly: 0, pointer: { x: 0, y: 0 } } };
    states.set(card, state);
    listen(card, 'pointerenter', event => { if (fine.matches && event.pointerType !== 'touch') activate(card); });
    listen(card, 'pointermove', event => {
      if (!fine.matches || event.pointerType === 'touch' || reduced.matches) return;
      activate(card);
      if (active !== card) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(movePointer);
    }, { passive: true });
    listen(card, 'pointerleave', () => { if (active === card) deactivate(); });
    listen(card, 'pointercancel', () => { if (active === card) deactivate(true); });
    listen(card, 'focusin', () => activate(card));
    listen(card, 'focusout', event => {
      if (active === card && !card.contains(event.relatedTarget) && !(fine.matches && card.matches(':hover'))) deactivate();
    });
    listen(card, 'click', event => {
      if (event.target.closest('a, button, input, select, textarea')) {
        if (active === card) deactivate();
        return; // Existing buttons/links navigate or open their original detail modal.
      }
      if (window.getSelection()?.toString()) return;
      if (!fine.matches) {
        // Touch background: preview only; View Details remains a normal single tap.
        if (active === card) deactivate(); else activate(card);
        return;
      }
      deactivate(); card.querySelector('.card-link')?.click();
    });
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      states.get(entry.target).visible = entry.isIntersecting;
      if (!entry.isIntersecting && entry.target === active) deactivate(true);
    });
    // Visibility alone must never import models, reveal objects, or start motion.
  }, { threshold: .05 }) : null;
  cards.forEach(card => observer?.observe(card));
  listen(document, 'pointerdown', event => { if (active && !active.contains(event.target)) deactivate(); }, { passive: true });
  listen(document, 'keydown', event => { if (event.key === 'Escape') deactivate(); });
  listen(document, 'visibilitychange', () => { if (document.hidden) deactivate(true); });
  function releaseStudio() {
    deactivate(true);
    studio?.dispose();
    studio = null;
  }
  listen(reduced, 'change', () => { if (reduced.matches) releaseStudio(); });
  listen(fine, 'change', releaseStudio);
  const unwatch = watchGraphics(() => {
    if (!permitted()) {
      studio?.dispose();
      studio = null;
      for (const state of states.values()) state.product = null;
    }
  });
  return () => {
    disposed = true; unwatch(); deactivate(true); observer?.disconnect(); removers.forEach(remove => remove());
    states.forEach(({ visual, image, object, motion, idle, entrance, fallback, exit, product }, card) => {
      idle?.kill(); entrance?.kill(); fallback?.kill(); exit?.kill(); product?.dispose();
      gsap.killTweensOf([card, image, visual, object, motion, motion.pointer]);
      gsap.set([card, image], { clearProps: 'transform' });
      visual.remove(); card.classList.remove('service-depth', 'is-exploring');
    });
    studio?.dispose();
    cardMotion.dispose();
  };
}
