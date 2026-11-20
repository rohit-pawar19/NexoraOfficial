import { gsap } from 'gsap';
import { initServiceCardEntrance } from './service-card-entrance.js';
import './service-card-motion.css';

// Scroll moves the outer grid item; hover moves the original card; parallax
// moves a separate image wrapper. The existing product reveal owns its own layer.
export function createServiceCardMotion(cards, reduced, fine) {
  const layers = new Map();
  for (const [index, card] of cards.entries()) {
    const shell = document.createElement('div'); shell.className = 'service-card-shell';
    card.before(shell); shell.append(card);
    const image = card.querySelector('.service-image');
    const object = document.createElement('div'); object.className = 'service-object-depth';
    image.before(object); object.append(image);
    const border = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    border.classList.add('service-border-reflection');
    border.setAttribute('aria-hidden', 'true'); border.setAttribute('focusable', 'false');
    const id = `nexora-service-border-${index}`;
    border.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#79500b"/><stop offset=".35" stop-color="#d4af37"/><stop offset=".55" stop-color="#fff2b8"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs><rect class="service-border-track" fill="none" stroke="url(#${id})"/><rect class="service-border-glint" fill="none" stroke="#fff2b8" pathLength="100" stroke-dasharray="7 93"/>`;
    card.append(border);
    const title = card.querySelector('h3'), number = card.querySelector('.service-number');
    gsap.set(card, { transformPerspective: 1000 });
    layers.set(card, { shell, object, image, border, title, number,
      glint: border.querySelector('.service-border-glint') });
  }
  const resize = new ResizeObserver(entries => {
    for (const { target: card } of entries) {
      const layer = layers.get(card);
      if (!layer) continue;
      const radius = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0;
      layer.border.querySelectorAll('rect').forEach(rect => {
        rect.setAttribute('x', '.5'); rect.setAttribute('y', '.5');
        rect.setAttribute('width', String(Math.max(0, card.offsetWidth - 1)));
        rect.setAttribute('height', String(Math.max(0, card.offsetHeight - 1)));
        rect.setAttribute('rx', String(radius));
      });
    }
  });
  cards.forEach(card => resize.observe(card));
  const disposeEntrance = initServiceCardEntrance(layers);
  function reset(card, duration) {
    const layer = layers.get(card);
    if (!layer) return;
    layer.sweep?.kill();
    gsap.to(card, { rotationX: 0, rotationY: 0, y: 0, duration, ease: 'power3.out', overwrite: true });
    gsap.to([layer.title, layer.number, layer.object], {
      x: 0, y: 0, z: 0, duration, ease: 'power3.out', overwrite: true,
    });
    gsap.to(layer.title, { '--title-line': 0, duration, overwrite: 'auto' });
    gsap.to(layer.border, { opacity: 0, duration, overwrite: true });
  }
  return {
    enter(card) {
      const layer = layers.get(card);
      layer.sweep?.kill();
      const duration = reduced.matches ? 0 : .55;
      gsap.to(card, { y: -8, duration, ease: 'power3.out', overwrite: 'auto' });
      gsap.to(layer.title, { y: -2, z: 5, '--title-line': 1, duration, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(layer.number, { y: -1, z: 3, duration, overwrite: true });
      gsap.to(layer.object, { z: 14, duration: .7, ease: 'power3.out', overwrite: true });
      gsap.to(layer.border, { opacity: .7, duration, overwrite: true });
      if (!reduced.matches) {
        layer.sweep = gsap.fromTo(layer.glint, { attr: { 'stroke-dashoffset': 0 } }, {
          attr: { 'stroke-dashoffset': -100 }, duration: 3.2, ease: 'none', repeat: -1,
        });
      }
    },
    move(card, x, y) {
      if (reduced.matches || !fine.matches) return;
      const layer = layers.get(card);
      // Normalized pointer values are -0.5..0.5: maximum tilt is five degrees.
      gsap.to(card, { rotationX: -y * 10, rotationY: x * 10, y: -8,
        duration: .65, ease: 'power3.out', overwrite: 'auto' });
      gsap.to(layer.title, { x: x * 2, y: -2 + y, z: 5, duration: .7, ease: 'power3.out', overwrite: 'auto' });
      gsap.to(layer.number, { x: x, y: -1 + y * .6, z: 3, duration: .8, overwrite: true });
      gsap.to(layer.object, { x: x * 5, y: y * 3, z: 14, duration: .7, ease: 'power3.out', overwrite: true });
    },
    leave(card, duration = .55) { reset(card, reduced.matches ? 0 : duration); },
    dispose() {
      disposeEntrance(); resize.disconnect();
      layers.forEach((layer, card) => {
        layer.sweep?.kill();
        gsap.killTweensOf([card, layer.shell, layer.object, layer.title, layer.number, layer.border]);
        gsap.set([card, layer.title, layer.number], { clearProps: 'transform' });
        layer.title.style.removeProperty('--title-line');
        layer.object.replaceWith(layer.image); layer.border.remove();
        layer.shell.replaceWith(card);
      });
      layers.clear();
    },
  };
}
