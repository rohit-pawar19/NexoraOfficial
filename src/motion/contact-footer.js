import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './contact-footer.css';

gsap.registerPlugin(ScrollTrigger);

function revealOnScroll(trigger) {
  return gsap.timeline({
    defaults: { ease: 'power2.out' },
    scrollTrigger: { trigger, start: 'clamp(top 80%)', once: true },
  });
}

export function initContactFooterMotion() {
  const contact = document.querySelector('#contact');
  const heading = contact?.querySelector('.cta-grid h2');
  const form = contact?.querySelector('#quoteForm');
  const footer = document.querySelector('.footer');
  const brand = footer?.querySelector('.footer-grid .brand');
  const logo = brand?.querySelector('img');
  const media = gsap.matchMedia();
  const played = new Set();

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const listeners = new AbortController();
    const { signal } = listeners;
    if (heading && !played.has(heading)) {
      revealOnScroll(heading)
        .from(heading, { y: 14, rotationX: 7, opacity: .35, duration: .8 })
        .call(() => played.add(heading));
    }

    if (form && !played.has(form)) {
      const fields = form.querySelectorAll('.enquiry-heading, .contact-field');
      const buttons = form.querySelectorAll('.contact-actions button');
      const entrance = revealOnScroll(form);
      entrance.from(form, { y: 15, z: -30, rotationX: 4, opacity: .45, duration: .95 }, 0);
      entrance.from(fields, { y: 10, opacity: .35, duration: .48, stagger: .065 }, .12);
      entrance.from(buttons, { y: 9, opacity: .45, duration: .48, stagger: .08 }, .6);
      entrance.fromTo(buttons, { '--button-shine': '-18%' }, {
        '--button-shine': '118%', duration: .68, stagger: .08,
      }, .7);
      entrance.call(() => played.add(form));
      form.addEventListener('focusin', () => entrance.progress(1), { signal });
    }

    if (logo && !played.has(footer)) {
      const tagline = brand.parentElement.querySelector('p');
      const links = [...footer.querySelectorAll('.footer-grid > div')].filter(column => !column.contains(brand));
      const copyright = footer.querySelector('.copyright');
      const entrance = revealOnScroll(footer);
      entrance.fromTo(logo, {
        y: 13, z: -50, rotationX: 8, opacity: .28, filter: 'brightness(.65)',
      }, { y: 0, z: 0, rotationX: 0, opacity: 1, filter: 'brightness(1)', duration: 1.65 }, 0);
      entrance.fromTo(brand, { '--logo-edge': '-22%', '--logo-spot': 0 }, {
        '--logo-edge': '122%', '--logo-spot': 1, duration: 1.5, ease: 'sine.inOut',
      }, .15);
      entrance.to(brand, { '--logo-spot': 0, duration: .5 }, 1.25);
      if (tagline) entrance.from(tagline, { y: 8, opacity: .35, duration: .5 }, 1.55);
      entrance.from([...links, copyright].filter(Boolean), {
        y: 10, opacity: .45, duration: .5, stagger: .1,
      }, 1.85);
      entrance.call(() => played.add(footer));
      footer.addEventListener('focusin', () => entrance.progress(1), { signal });
    }

    return () => listeners.abort();
  });

  return () => media.revert();
}
