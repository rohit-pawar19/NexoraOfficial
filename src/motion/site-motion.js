import './site-motion.css';

const headingSelector = 'main section :is(h1, h2), main #reviewsSummary';
const ownedHeading = '#about .about-content, #why .why-intro, .why-typography, #contact, .portfolio-clients';
const magnetic = '.btn-gold, .quote-btn a, #contact .contact-actions button';

export function initSiteMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const listeners = new AbortController();
  const { signal } = listeners;
  const seen = new Set();
  const running = new Map();
  const headings = [...document.querySelectorAll(headingSelector)]
    .filter(heading => !heading.closest(ownedHeading));
  const tokens = getComputedStyle(document.documentElement);
  const easing = tokens.getPropertyValue('--motion-ease-enter').trim() || 'ease-out';
  const duration = parseFloat(tokens.getPropertyValue('--motion-heading-time')) || 580;
  let observer;
  let button;
  let frame = 0;
  let pointer;

  function reveal(heading) {
    observer.unobserve(heading);
    seen.add(heading);
    if (heading.contains(document.activeElement)) return;
    const isIntro = heading.matches('h1') || heading.closest('.page-intro');
    const lead = heading.nextElementSibling?.matches('p') ? heading.nextElementSibling : null;
    const animations = [heading.animate([
      { opacity: .42, translate: `0 ${isIntro ? 12 : 9}px` },
      { opacity: 1, translate: '0 0' },
    ], { duration, easing })];
    if (lead) {
      animations.push(lead.animate([
        { opacity: .62, translate: '0 5px' },
        { opacity: 1, translate: '0 0' },
      ], { duration: duration * .85, delay: 70, easing, fill: 'backwards' }));
    }
    running.set(heading, animations);
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (running.get(heading) === animations) running.delete(heading);
    });
  }

  function watchHeadings() {
    observer?.disconnect();
    for (const animations of running.values()) animations.forEach(animation => animation.cancel());
    running.clear();
    if (reduced.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
    observer = new IntersectionObserver(entries => {
      if (reduced.matches) return;
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting && !seen.has(target)) reveal(target);
      }
    }, { rootMargin: '0px 0px -5% 0px' });
    headings.forEach(heading => { if (!seen.has(heading)) observer.observe(heading); });
  }

  function resetButton() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!button) return;
    button.style.removeProperty('--motion-x');
    button.style.removeProperty('--motion-y');
    button = undefined;
  }

  function move(event) {
    if (event.pointerType !== 'mouse' || !fine.matches || reduced.matches) return;
    const target = event.target.closest(magnetic);
    if (button !== target) resetButton();
    if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;
    button = target;
    pointer = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const box = button.getBoundingClientRect();
      const x = Math.max(-4, Math.min(4, (pointer.x - box.left - box.width / 2) * .09));
      const y = Math.max(-2, Math.min(2, (pointer.y - box.top - box.height / 2) * .10));
      button.style.setProperty('--motion-x', `${x.toFixed(2)}px`);
      button.style.setProperty('--motion-y', `${y.toFixed(2)}px`);
    });
  }

  document.addEventListener('pointermove', move, { passive: true, signal });
  document.addEventListener('pointerout', event => {
    if (button && !button.contains(event.relatedTarget)) resetButton();
  }, { passive: true, signal });
  document.addEventListener('pointercancel', resetButton, { signal });
  document.addEventListener('focusin', event => {
    if (event.target.matches(':focus-visible')) resetButton();
    for (const [heading, animations] of running) {
      if (heading.parentElement.contains(event.target)) animations.forEach(animation => animation.cancel());
    }
  }, { signal });
  window.addEventListener('blur', resetButton, { signal });
  fine.addEventListener('change', resetButton, { signal });
  reduced.addEventListener('change', () => {
    resetButton();
    watchHeadings();
  }, { signal });
  watchHeadings();

  return () => {
    listeners.abort();
    resetButton();
    observer?.disconnect();
    for (const animations of running.values()) animations.forEach(animation => animation.cancel());
  };
}
