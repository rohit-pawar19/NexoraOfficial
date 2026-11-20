import { gsap } from 'gsap';
import './industry-worlds.css';

// Simplified industry-only fallback art: no single-building or rotating-ring icons.
const tower = (x, y, h) => `<path d="M${x} ${y}v-${h}l19-5 17 6v${h}l-17 6Z" fill="#7897a9" fill-opacity=".7" stroke="#d4af37"/><path d="M${x + 19} ${y - h - 5}v${h + 11}" stroke="#eee0bd"/>`;
const artworks = {
  architecture: `<path d="m22 80 98-32 109 36-102 37Z" fill="#304f43" stroke="#b9af8d"/><path d="m36 84 88-22 83 26" stroke="#757c78" stroke-width="8" fill="none"/><g class="world-built">${tower(58, 77, 42)}${tower(105, 68, 55)}${tower(157, 81, 34)}<path d="m100 100 23-7 29 7-24 8Z" fill="#478fa7" stroke="#e8dfcd"/><g fill="#597e53"><circle cx="44" cy="83" r="5"/><circle cx="188" cy="95" r="5"/><circle cx="77" cy="100" r="5"/></g></g>`,
  jewellery: '<path d="m29 86 90-27 101 31-97 31Z" fill="#d5cbb7" stroke="#d4af37"/><path d="M41 82V30l81-15 85 23v47" fill="#18263d" stroke="#d4af37"/><g class="world-built" fill="#87a5b080" stroke="#d4af37"><path d="m52 72 27-8 28 9v20l-27 9-28-10Z"/><path d="m136 69 25-7 29 9v20l-29 8-25-11Z"/><path d="m94 91 27-8 30 10v17l-30 8-27-9Z"/></g><g fill="#fff2b8"><circle cx="76" cy="75" r="3"/><circle cx="162" cy="74" r="3"/><circle cx="120" cy="97" r="3"/></g><path d="M75 30 77 57M166 35l-4 20" stroke="#fff2b8" stroke-opacity=".5"/>',
  storefront: '<path d="m23 83 98-31 107 35-99 34Z" fill="#14293f" stroke="#d4af3760"/><g class="world-built" fill="#24435c" stroke="#d4af37"><path d="M45 84V54l32-7 28 9v29l-28 8Z"/><path d="M145 91V63l31-7 28 8v28l-29 8Z"/><path d="M87 58V26l25-6 25 8v33l-25 7Z"/><path d="M155 56V12l21-5 23 8v45l-24 5Z"/></g><path d="m78 94 38-24 52 25m-56-25 63-10" fill="none" stroke="#d4af37"/><path d="m49 42 59-24 52-12" fill="none" stroke="#f6d66b" stroke-width="2"/>',
};
const types = ['architecture', 'jewellery', 'storefront'];
const durations = [5.2, 4.4, 4.8];

export function initIndustryWorlds() {
  const cards = [...document.querySelectorAll('#industry .industry-card')];
  if (!cards.length) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 767.98px), (pointer: coarse)');
  const states = new Map(), removers = [];
  let active = null, studio = null, loading = false, failed = false, disposed = false;
  function listen(target, event, fn, options) {
    target.addEventListener(event, fn, options);
    removers.push(() => target.removeEventListener(event, fn, options));
  }
  function ensure() {
    if (!active?.visible || disposed || reduced.matches || mobile.matches || document.hidden || failed) return;
    if (!studio) {
      if (loading) return;
      loading = true;
      import('./industry-studio.js').then(({ createIndustryStudio }) => {
        loading = false;
        if (disposed || !active?.visible || reduced.matches || mobile.matches || document.hidden) return;
        studio = createIndustryStudio(); ensure();
      }).catch(error => { loading = false; failed = true; console.warn('Industry worlds using simplified artwork.', error); });
      return;
    }
    if (!active.product) active.product = studio.add(active.host, active);
    active.product?.sync();
  }
  function release(state) { state.product?.dispose(); state.product = null; }
  function leave(immediate = false) {
    if (!active) return;
    const state = active; active = null;
    state.active = state.selected = false;
    state.card.classList.remove('is-world-selected');
    state.entrance?.kill(); state.exit?.kill(); state.product?.sync();
    gsap.to(state.pointer, { x: 0, y: 0, duration: immediate || reduced.matches ? 0 : .55, overwrite: true });
    state.exit = gsap.to(state.host, { autoAlpha: 0, scale: .97, duration: immediate || reduced.matches ? 0 : .55,
      ease: 'power2.inOut', overwrite: true, onComplete: () => release(state) });
  }
  function enter(state) {
    if (active === state || disposed || document.hidden) return;
    leave(); active = state; state.active = state.selected = state.visible = true;
    state.exit?.kill(); state.entrance?.kill(); release(state);
    state.progress = 0; state.host.style.setProperty('--world-progress', '0');
    state.card.classList.add('is-world-selected');
    const minimal = reduced.matches;
    state.entrance = gsap.timeline();
    state.entrance.fromTo(state.host, { autoAlpha: 0, scale: .97 }, { autoAlpha: 1, scale: 1,
      duration: minimal ? 0 : .65, ease: 'power2.out' }, 0);
    state.entrance.to(state, { progress: 1, duration: minimal ? 0 : mobile.matches ? 1.4 : state.duration,
      ease: state.type === 'architecture' ? 'power1.inOut' : state.type === 'jewellery' ? 'sine.inOut' : 'power2.inOut',
      onUpdate: () => state.host.style.setProperty('--world-progress', String(state.progress)),
    }, minimal ? 0 : .15);
    ensure();
  }
  cards.forEach((card, index) => {
    const type = types[index]; if (!type) return;
    const host = document.createElement('div'); host.className = 'industry-world'; host.setAttribute('aria-hidden', 'true');
    host.innerHTML = `<svg viewBox="0 0 250 125" preserveAspectRatio="xMidYMid meet" focusable="false">${artworks[type]}</svg>`;
    card.append(host);
    const state = { type, duration: durations[index], host, card, active: false, visible: false, selected: false,
      progress: 0, pointer: { x: 0, y: 0 } };
    states.set(card, state);
    listen(card, 'pointerenter', event => { if (event.pointerType !== 'touch') enter(state); });
    listen(card, 'focusin', () => enter(state));
    listen(card, 'click', event => {
      if (event.target.closest('a')) return;
      if (active === state && mobile.matches) leave(); else enter(state);
    });
    listen(card, 'pointermove', event => {
      if (active !== state || reduced.matches || mobile.matches || event.pointerType === 'touch') return;
      const box = card.getBoundingClientRect();
      gsap.to(state.pointer, { x: gsap.utils.clamp(-1, 1, (event.clientX - box.left) / box.width * 2 - 1),
        y: gsap.utils.clamp(-1, 1, (event.clientY - box.top) / box.height * 2 - 1), duration: .7, ease: 'power3.out', overwrite: true });
    }, { passive: true });
    listen(card, 'pointerleave', () => { if (active === state) leave(); });
    listen(card, 'pointercancel', () => { if (active === state) leave(true); });
    listen(card, 'focusout', event => { if (active === state && !card.contains(event.relatedTarget)) leave(); });
  });
  function measure() {
    states.forEach(({ card, product }) => {
      card.style.setProperty('--industry-world-height', `${Math.max(0, Math.min(165, card.querySelector('h3').offsetTop - 22))}px`);
      product?.sync();
    });
  }
  const resize = new ResizeObserver(measure);
  states.forEach(({ card }) => { resize.observe(card); resize.observe(card.querySelector('h3')); }); measure();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const state = states.get(entry.target); state.visible = entry.isIntersecting;
      if (!state.visible && active === state) leave(true);
      state.product?.sync();
    });
    // Visibility only gates performance. It never starts an industry animation.
  }, { threshold: .08 });
  cards.forEach(card => observer.observe(card));
  listen(document, 'pointerdown', event => { if (active && !active.card.contains(event.target)) leave(); }, { passive: true });
  listen(document, 'keydown', event => { if (event.key === 'Escape') leave(); });
  listen(reduced, 'change', () => { leave(true); studio?.dispose(); studio = null; });
  listen(mobile, 'change', () => { leave(true); studio?.dispose(); studio = null; });
  listen(document, 'visibilitychange', () => { if (document.hidden) leave(true); });
  return () => {
    disposed = true; leave(true); observer.disconnect(); resize.disconnect(); removers.forEach(remove => remove());
    states.forEach(state => {
      state.entrance?.kill(); state.exit?.kill(); gsap.killTweensOf([state.pointer, state.host]);
      state.host.remove(); state.card.classList.remove('is-world-selected'); state.card.style.removeProperty('--industry-world-height');
    }); studio?.dispose();
  };
}
