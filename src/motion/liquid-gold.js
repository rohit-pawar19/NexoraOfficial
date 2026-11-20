import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './liquid-gold.css';

gsap.registerPlugin(ScrollTrigger);

const streamStart = 'M -18 33 C 89 33 158 22 268 24 C 391 26 449 44 571 34 C 685 25 741 13 851 20 C 942 26 1007 37 1090 29';
const streamEnd = 'M -18 33 C 89 19 158 10 268 19 C 391 29 449 48 571 31 C 685 15 741 6 851 14 C 942 21 1007 30 1090 24';

function createStream(index) {
  const gold = `liquid-metal-${index}`;
  const mask = `liquid-mask-${index}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('liquid-gold');
  svg.setAttribute('viewBox', '0 0 1080 54');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <linearGradient id="${gold}" x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox">
        <stop stop-color="#633d12"/>
        <stop offset=".26" stop-color="#be8f41"/>
        <stop offset=".4" stop-color="#f9e2a5"/>
        <stop offset=".52" stop-color="#fff1c8"/>
        <stop offset=".66" stop-color="#b78236"/>
        <stop offset="1" stop-color="#724813"/>
      </linearGradient>
      <mask id="${mask}" x="0" y="0" width="1080" height="54" maskUnits="userSpaceOnUse">
        <path d="${streamStart}" stroke="white" stroke-width="20" fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      </mask>
    </defs>
    <g mask="url(#${mask})">
      <path d="${streamStart}" transform="translate(0 2.5)" stroke="#40270e" stroke-width="7" fill="none" opacity=".28"/>
      <path d="${streamStart}" stroke="url(#${gold})" stroke-width="5" fill="none"/>
      <path class="liquid-gold-highlight" d="${streamStart}" stroke="#ffebbb" stroke-width="1.1" fill="none" pathLength="1" stroke-dasharray=".1 1" stroke-dashoffset=".1"/>
    </g>`;
  return svg;
}

export function initLiquidGold() {
  const boundaries = document.querySelectorAll('#about, #industry, #services, .portfolio-clients, .contact-page .footer');
  const played = new Set();
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const streams = [];
    boundaries.forEach((section, index) => {
      if (played.has(section)) return;
      const svg = createStream(index);
      section.classList.add('has-liquid-gold');
      section.prepend(svg);
      streams.push([section, svg]);
      const draw = svg.querySelector('mask path');
      const highlight = svg.querySelector('.liquid-gold-highlight');
      const flow = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'clamp(top 88%)', once: true },
        onComplete: () => { played.add(section); svg.remove(); },
      });
      flow.to(draw, { attr: { 'stroke-dashoffset': 0 }, duration: .95, ease: 'power2.inOut' }, 0);
      flow.to(svg.querySelectorAll('path'), {
        attr: { d: streamEnd }, duration: 1.45, ease: 'sine.inOut',
      }, 0);
      flow.to(highlight, { attr: { 'stroke-dashoffset': -1 }, duration: 1.05, ease: 'sine.inOut' }, .35);
      flow.to(svg, { opacity: 0, duration: .55, ease: 'sine.inOut' }, 1.15);
    });
    return () => {
      for (const [section, svg] of streams) {
        svg.remove();
        section.classList.remove('has-liquid-gold');
      }
    };
  });
  return () => media.revert();
}
