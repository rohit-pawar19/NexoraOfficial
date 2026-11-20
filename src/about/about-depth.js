import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './about-depth.css';

gsap.registerPlugin(ScrollTrigger);

export function initAboutDepth() {
  const section = document.querySelector('#about');
  if (!section) return () => {};
  const heading = section.querySelector('.about-content h2');
  const description = [...section.querySelectorAll('.about-content > p')];
  const stats = section.querySelector('.stats');
  if (!heading || !stats) return () => {};
  const items = [...stats.children];
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    section.classList.add('about-depth-enabled');
    const originals = [];
    const entrance = gsap.timeline({ scrollTrigger: {
      trigger: heading, start: 'top 90%', once: true,
    }, defaults: { ease: 'power2.inOut' } });
    entrance.fromTo(heading, {
      y: 18, z: -45, rotationX: 6, opacity: 0, transformOrigin: '50% 100%',
    }, { y: 0, z: 0, rotationX: 0, opacity: 1, duration: 1.35, clearProps: 'transform,opacity,transformOrigin' }, 0);
    entrance.fromTo(description, { y: 12, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.2, stagger: .09, clearProps: 'transform,opacity',
    }, .15);

    const numbers = gsap.timeline({ scrollTrigger: {
      trigger: stats, start: 'top 80%', once: true,
    }, defaults: { ease: 'power2.inOut' } });
    items.forEach((item, i) => {
      const offset = i * .12;
      numbers.fromTo(item, {
        y: 16, z: -[28, 48, 36, 60][i % 4], rotationX: 7, rotationY: i % 2 ? 4 : -4, opacity: 0,
      }, { y: 0, z: 0, rotationX: 0, rotationY: 0, opacity: 1, duration: 1.3, clearProps: 'transform,opacity' }, offset);
      numbers.to(item, { '--accent-progress': 1, duration: 1.15 }, offset + .25);
      numbers.fromTo(item, { '--stat-reflection': '125%' }, { '--stat-reflection': '-25%', duration: 1.4 }, offset + .1);
      const value = item.querySelector('strong');
      const original = value?.textContent;
      const match = original?.match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
      if (!value || !match || match[3].includes('°')) return;
      const final = document.createElement('span');
      final.className = 'about-depth-final';
      final.textContent = original;
      const count = document.createElement('span');
      count.className = 'about-depth-count';
      count.setAttribute('aria-hidden', 'true');
      const state = { value: 0 };
      const precision = match[2].split('.')[1]?.length || 0;
      const format = new Intl.NumberFormat('en-US', {
        useGrouping: match[2].includes(','), minimumFractionDigits: precision, maximumFractionDigits: precision,
      });
      const update = () => { count.textContent = `${match[1]}${format.format(state.value)}${match[3]}`; };
      update();
      value.replaceChildren(final, count);
      originals.push({ value, original });
      numbers.to(state, {
        value: Number(match[2].replaceAll(',', '')), duration: 1.8,
        onUpdate: update, onComplete: () => { value.textContent = original; },
      }, offset);
    });

    // Bounded, scroll-driven separation; no autonomous card movement.
    const parallax = gsap.timeline({ scrollTrigger: {
      trigger: section, start: 'top bottom', end: 'bottom top', scrub: .8,
    } });
    parallax.to(heading, { '--depth-parallax': '-8px', ease: 'none' }, 0);
    parallax.to(description, { '--depth-parallax': '-4px', ease: 'none' }, 0);
    parallax.to(stats, { '--depth-parallax': '-2px', ease: 'none' }, 0);

    // A focused CTA never waits for the copy's visual reveal.
    const focus = () => entrance.progress(1);
    section.addEventListener('focusin', focus);
    return () => {
      section.removeEventListener('focusin', focus);
      originals.forEach(({ value, original }) => { value.textContent = original; });
      section.classList.remove('about-depth-enabled');
    };
  });
  return () => media.revert();
}
