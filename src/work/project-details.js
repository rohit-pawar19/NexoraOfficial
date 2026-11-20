import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const projectLink = '.portfolio-image-link, .website-preview-link, .website-card-actions a';

export function initProjectDetails(gallery, cards) {
  const revealed = new Set();
  const media = gsap.matchMedia();

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const listeners = new AbortController();
    const { signal } = listeners;
    const triggers = new Map();
    let batchStart = -Infinity;
    let batchIndex = 0;

    function clearReveal(card) {
      card.classList.remove('project-revealing');
      card.style.removeProperty('--project-reveal-delay');
    }

    function reveal(card) {
      triggers.get(card)?.kill();
      triggers.delete(card);
      if (revealed.has(card)) return;
      revealed.add(card);
      const now = performance.now();
      if (now - batchStart > 50) {
        batchStart = now;
        batchIndex = 0;
      }
      card.style.setProperty('--project-reveal-delay', `${Math.min(batchIndex++, 3) * 65}ms`);
      card.classList.add('project-revealing');
    }

    function refresh() {
      for (const card of cards) {
        if (card.closest('[hidden]')) {
          triggers.get(card)?.kill();
          triggers.delete(card);
          clearReveal(card);
        } else if (!revealed.has(card) && !triggers.has(card)) {
          const trigger = ScrollTrigger.create({
            trigger: card,
            start: 'top 82%',
            onEnter: () => reveal(card),
            onEnterBack: () => reveal(card),
          });
          if (revealed.has(card)) trigger.kill();
          else triggers.set(card, trigger);
        }
      }
      for (const trigger of triggers.values()) trigger.refresh();
    }

    gallery.addEventListener('focusin', ({ target }) => {
      const card = target.closest('.portfolio-card');
      if (!card) return;
      reveal(card);
      clearReveal(card);
    }, { signal });
    gallery.addEventListener('animationend', (event) => {
      if (event.animationName === 'project-entrance-light') {
        const card = event.target.closest('.portfolio-card');
        if (card) clearReveal(card);
      }
    }, { signal });

    const observer = new MutationObserver(refresh);
    observer.observe(gallery, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    refresh();

    return () => {
      listeners.abort();
      observer.disconnect();
      for (const trigger of triggers.values()) trigger.kill();
      for (const card of cards) clearReveal(card);
    };
  });

  media.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)', () => {
    const listeners = new AbortController();
    const { signal } = listeners;
    const cursor = document.createElement('div');
    cursor.className = 'project-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.textContent = 'VIEW PROJECT';
    document.body.append(cursor);

    const followX = gsap.quickTo(cursor, 'x', { duration: 0.34, ease: 'power3.out' });
    const followY = gsap.quickTo(cursor, 'y', { duration: 0.34, ease: 'power3.out' });
    let active;
    let motion;
    let cursorVisible = false;

    function cursorPosition(event) {
      const offset = 16;
      const size = 76;
      return {
        x: event.clientX + offset + size < window.innerWidth ? event.clientX + offset : event.clientX - offset - size,
        y: event.clientY + offset + size < window.innerHeight ? event.clientY + offset : event.clientY - offset - size,
      };
    }

    function showCursor(show, event) {
      if (show === cursorVisible) return;
      cursorVisible = show;
      if (show) {
        const { x, y } = cursorPosition(event);
        followX(x, x);
        followY(y, y);
      }
      cursor.classList.toggle('is-visible', show);
    }

    function reset() {
      if (active) {
        motion.x(0);
        motion.y(0);
        motion.lift(0);
        active.classList.remove('project-inspecting');
        active = undefined;
      }
      showCursor(false);
    }

    const rotations = new Map();
    function inspect(event) {
      if (event.pointerType !== 'mouse') return;
      const card = event.target.closest('.portfolio-card');
      if (!card) return reset();

      if (card !== active) {
        reset();
        active = card;
        if (!rotations.has(card)) {
          const options = { duration: 0.48, ease: 'power3.out' };
          rotations.set(card, {
            x: gsap.quickTo(card, '--inspect-x', options),
            y: gsap.quickTo(card, '--inspect-y', options),
            lift: gsap.quickTo(card, '--inspect-lift', options),
          });
        }
        motion = rotations.get(card);
        motion.lift(10);
        card.classList.add('project-inspecting');
      }

      const bounds = card.getBoundingClientRect();
      const normalize = (position, start, size) => gsap.utils.clamp(-1, 1, (position - start) / size * 2 - 1);
      motion.x(normalize(event.clientX, bounds.left, bounds.width));
      motion.y(normalize(event.clientY, bounds.top, bounds.height));
      showCursor(Boolean(event.target.closest(projectLink)), event);
      if (cursorVisible) {
        const { x, y } = cursorPosition(event);
        followX(x);
        followY(y);
      }
    }

    gallery.addEventListener('pointermove', inspect, { signal, passive: true });
    gallery.addEventListener('pointerout', (event) => {
      if (!active || active.contains(event.relatedTarget)) {
        if (event.target.closest(projectLink) !== event.relatedTarget?.closest?.(projectLink)) {
          showCursor(false);
        }
        return;
      }
      reset();
    }, { signal });
    gallery.addEventListener('pointerleave', reset, { signal });
    gallery.addEventListener('pointercancel', reset, { signal });
    gallery.addEventListener('focusin', ({ target }) => {
      if (target.matches(':focus-visible')) reset();
    }, { signal });
    window.addEventListener('blur', reset, { signal });
    document.getElementById('work-service')?.addEventListener('change', reset, { signal });

    return () => {
      listeners.abort();
      reset();
      followX.tween.kill();
      followY.tween.kill();
      cursor.remove();
      for (const [card, rotation] of rotations) {
        rotation.x.tween.kill();
        rotation.y.tween.kill();
        rotation.lift.tween.kill();
        card.style.removeProperty('--inspect-x');
        card.style.removeProperty('--inspect-y');
        card.style.removeProperty('--inspect-lift');
      }
    };
  });

  return () => media.revert();
}
