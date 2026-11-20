import { gsap } from 'gsap';
import './navbar-glass.css';

export function initNavbarGlass() {
  const navbar = document.querySelector('#mainNavbar');
  if (!navbar) return () => {};
  const links = [...navbar.querySelectorAll('.navbar-nav > .nav-item > .nav-link')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 992px)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const indicator = document.createElement('span');
  indicator.className = 'nav-gold-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  navbar.append(indicator);
  navbar.classList.add('glass-enhanced');
  let scrolled = null, reflected = false, selected = null, sweep;
  const active = () => links.find(link => link.classList.contains('active') || link.getAttribute('aria-current') === 'page');
  const duration = () => reduced.matches ? 0 : .55;

  function place(link = active(), immediate = false) {
    selected = link;
    if (!link || !desktop.matches) {
      gsap.set(indicator, { opacity: 0 });
      return;
    }
    const box = link.getBoundingClientRect();
    const base = navbar.getBoundingClientRect();
    // Offset measurements ignore the few-pixel magnetic transform on the link.
    const x = Number(gsap.getProperty(link, 'x')) || 0;
    const y = Number(gsap.getProperty(link, 'y')) || 0;
    gsap.to(indicator, {
      x: box.left - base.left - x, y: box.bottom - base.top - y - 2,
      width: box.width, opacity: 1, duration: immediate ? 0 : duration(),
      ease: 'power3.out', overwrite: true,
    });
  }

  function scroll() {
    const next = window.scrollY > 30;
    if (next === scrolled) return;
    scrolled = next;
    navbar.classList.toggle('scrolled', next);
    gsap.to(navbar, { '--glass': next ? 1 : 0, duration: duration(), ease: 'power2.inOut', overwrite: 'auto' });
    if (next && !reflected && !reduced.matches) {
      reflected = true;
      sweep = gsap.timeline();
      sweep.set(navbar, { '--reflection': '-20%', '--reflection-opacity': .15 });
      sweep.to(navbar, { '--reflection': '120%', duration: 1.35, ease: 'sine.inOut' });
      sweep.to(navbar, { '--reflection-opacity': 0, duration: .25 }, '-=.25');
    }
    if (!next || reduced.matches) {
      sweep?.kill();
      gsap.set(navbar, { '--reflection-opacity': 0 });
    }
  }

  const removers = [];
  function listen(target, event, callback, options) {
    target.addEventListener(event, callback, options);
    removers.push(() => target.removeEventListener(event, callback, options));
  }
  const collapse = navbar.querySelector('.navbar-collapse');
  listen(navbar, 'click', event => {
    const link = event.target.closest('.services-dropdown .dropdown-item');
    if (!link || link.pathname !== location.pathname || !link.hash || !collapse?.classList.contains('show')) return;
    window.bootstrap?.Collapse.getOrCreateInstance(collapse, { toggle: false }).hide();
  });
  for (const link of links) {
    const reset = () => {
      gsap.to(link, { x: 0, y: 0, duration: reduced.matches ? 0 : .4, ease: 'power3.out', overwrite: true });
    };
    listen(link, 'pointerenter', event => {
      if (event.pointerType !== 'touch') place(link);
    });
    listen(link, 'pointermove', event => {
      if (reduced.matches || !desktop.matches || !fine.matches || event.pointerType === 'touch') return;
      const box = link.getBoundingClientRect();
      const x = Number(gsap.getProperty(link, 'x')) || 0;
      const y = Number(gsap.getProperty(link, 'y')) || 0;
      gsap.to(link, {
        x: gsap.utils.clamp(-3, 3, (event.clientX - box.left + x - box.width / 2) * .09),
        y: gsap.utils.clamp(-2, 2, (event.clientY - box.top + y - box.height / 2) * .09),
        duration: .35, ease: 'power3.out', overwrite: true,
      });
    }, { passive: true });
    listen(link, 'pointerleave', () => {
      reset();
      place(links.includes(document.activeElement) ? document.activeElement : active());
    });
    listen(link, 'focus', () => place(link));
    listen(link, 'blur', () => place(active()));
  }
  const refresh = () => {
    if (!desktop.matches || reduced.matches) gsap.set(links, { x: 0, y: 0 });
    place(selected || active(), true);
    // Reapply immediately when reduced motion is enabled during a transition.
    if (reduced.matches) scrolled = null;
    scroll();
  };
  const observer = new MutationObserver(() => place(active()));
  links.forEach(link => observer.observe(link, { attributes: true, attributeFilter: ['class', 'aria-current'] }));
  const resize = new ResizeObserver(() => place(selected || active(), true));
  resize.observe(navbar);
  links.forEach(link => resize.observe(link));
  listen(window, 'scroll', scroll, { passive: true });
  listen(window, 'resize', refresh, { passive: true });
  listen(reduced, 'change', refresh);
  listen(desktop, 'change', refresh);
  scroll();
  place(active(), true);
  let disposed = false;
  document.fonts?.ready.then(() => { if (!disposed) place(selected || active(), true); });
  return () => {
    disposed = true;
    removers.forEach(remove => remove());
    observer.disconnect();
    resize.disconnect();
    sweep?.kill();
    gsap.killTweensOf([navbar, indicator, ...links]);
    gsap.set(links, { clearProps: 'transform' });
    indicator.remove();
    navbar.classList.remove('glass-enhanced', 'scrolled');
    ['--glass', '--reflection', '--reflection-opacity'].forEach(property => navbar.style.removeProperty(property));
  };
}
