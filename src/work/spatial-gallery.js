import { gsap } from 'gsap';
import { initProjectDetails } from './project-details.js';

export function initSpatialGallery() {
  const gallery = document.getElementById('work-collections');
  if (!gallery) return () => {};

  const cards = [...gallery.querySelectorAll('.portfolio-card')];
  const disposeDetails = initProjectDetails(gallery, cards);
  const media = gsap.matchMedia();
  media.add({
    motion: '(prefers-reduced-motion: no-preference)',
    touch: '(hover: none), (pointer: coarse)',
  }, ({ conditions }) => {
    if (!conditions.motion || !('IntersectionObserver' in window)) return;

    const listeners = new AbortController();
    const { signal } = listeners;
    const visible = new Set();
    const moves = new Map();
    let hovered;
    let selected;
    let frame = 0;

    function select(next) {
      if (next === selected) return;
      const previousGrid = selected?.parentElement;
      selected?.classList.remove('is-featured');
      selected = next;
      selected?.classList.add('is-featured');

      const nextGrid = selected?.parentElement;
      for (const card of cards) {
        const grid = card.parentElement;
        if (grid !== previousGrid && grid !== nextGrid) continue;
        moves.get(card)?.kill();
        const depth = card === selected ? 1 : grid === nextGrid ? -0.45 : 0;
        moves.set(card, gsap.to(card, {
          '--project-depth': depth,
          duration: 0.66,
          ease: 'power3.out',
        }));
      }
    }

    function update() {
      frame = 0;
      const center = window.innerHeight * 0.5;
      let nearest;
      let distance = center * 0.58;
      const parallax = [];

      for (const card of visible) {
        if (card.hidden || card.closest('[hidden]')) continue;
        const bounds = card.getBoundingClientRect();
        const offset = bounds.top + bounds.height / 2 - center;
        const travel = conditions.touch ? 4 : 10;
        parallax.push([card, gsap.utils.clamp(-1, 1, offset / center) * travel]);
        // Keep the current project until another moves clearly into the viewing area.
        const proximity = Math.abs(offset) - (card === selected ? 24 : 0);
        if (conditions.touch && proximity < distance) {
          nearest = card;
          distance = proximity;
        }
      }

      for (const [card, offset] of parallax) {
        card.style.setProperty('--project-parallax', `${offset.toFixed(2)}px`);
      }
      const focused = gallery.querySelector(':focus-visible')?.closest('.portfolio-card');
      if (hovered?.closest('[hidden]')) hovered = undefined;
      select(focused || hovered || nearest);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    const viewport = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) visible.add(target);
        else visible.delete(target);
      }
      schedule();
    });

    for (const card of cards) {
      viewport.observe(card);
      card.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'touch') {
          hovered = card;
          schedule();
        }
      }, { signal });
      card.addEventListener('pointerleave', () => {
        if (hovered === card) {
          hovered = undefined;
          schedule();
        }
      }, { signal });
    }
    gallery.addEventListener('focusin', schedule, { signal });
    gallery.addEventListener('focusout', schedule, { signal });
    window.addEventListener('scroll', () => {
      if (visible.size) schedule();
    }, { passive: true, signal });
    window.addEventListener('resize', schedule, { signal });
    const filter = new MutationObserver(schedule);
    filter.observe(gallery, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    schedule();

    return () => {
      listeners.abort();
      viewport.disconnect();
      filter.disconnect();
      cancelAnimationFrame(frame);
      for (const card of cards) {
        moves.get(card)?.kill();
        card.classList.remove('is-featured');
        card.style.removeProperty('--project-depth');
        card.style.removeProperty('--project-parallax');
      }
    };
  });

  return () => {
    disposeDetails();
    media.revert();
  };
}
