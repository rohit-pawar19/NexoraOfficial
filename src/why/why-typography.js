import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './why-typography.css';

gsap.registerPlugin(ScrollTrigger);

export function initWhyTypography() {
  const section = document.querySelector('#why'), grid = section?.querySelector('.why-grid');
  const list = section?.querySelector('.why-list'), intro = grid?.firstElementChild;
  const rows = [...(list?.children || [])];
  if (!grid || rows.length !== 8) return () => {};
  const heading = intro.querySelector('h2'), eyebrow = intro.querySelector('.eyebrow'), lead = intro.querySelector('.why-lead');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const compact = window.matchMedia('(max-width: 767.98px)');
  const layers = new Map(), removers = [], completed = new Set();
  const keywords = ['One-stop', 'One point', 'Creative + Digital', 'Industry-focused', 'Complete', 'Online + Offline', 'Consistent', 'Customized'];
  const unity = document.createElement('p'); unity.className = 'why-type-unity';
  unity.innerHTML = '<span>One Partner.</span> <span>Every Marketing Need.</span>';
  grid.append(unity); section.classList.add('why-typography');
  let headingDone = false, unityDone = false, unityVisible = false, finalSequence = null, hovered = null, disposed = false;
  const listen = (target, event, fn, options) => {
    target.addEventListener(event, fn, options); removers.push(() => target.removeEventListener(event, fn, options));
  };
  rows.forEach((row, index) => {
    const nodes = [...row.childNodes], number = row.querySelector('b'), title = row.querySelector(':scope > span');
    const titleNodes = [...title.childNodes], tabindex = row.getAttribute('tabindex');
    // The actual cards contain a number and a title. Existing paragraphs, if
    // present, stay ordinary HTML; no benefit descriptions are fabricated.
    const descriptions = [...row.querySelectorAll(':scope > p')];
    const hover = document.createElement('span'); hover.className = 'why-type-hover';
    hover.append(...nodes); row.append(hover);
    const numberLayer = document.createElement('span'); numberLayer.className = 'why-type-number-layer'; number.before(numberLayer); numberLayer.append(number);
    const titleLayer = document.createElement('span'); titleLayer.className = 'why-type-title-layer'; title.before(titleLayer); titleLayer.append(title);
    const text = title.textContent, at = text.indexOf(keywords[index]);
    if (at >= 0) {
      const keyword = document.createElement('span'); keyword.className = 'why-type-keyword'; keyword.textContent = keywords[index];
      title.replaceChildren(document.createTextNode(text.slice(0, at)), keyword, document.createTextNode(text.slice(at + keywords[index].length)));
    }
    title.classList.add('why-type-title'); row.classList.add('why-type-row'); row.setAttribute('tabindex', '0');
    layers.set(row, { index, number, title, descriptions, hover, numberLayer, titleLayer, nodes, titleNodes, tabindex,
      numberColor: getComputedStyle(number).color });
  });
  function finishUnity() {
    if (completed.size !== 8 || unityDone || finalSequence || (!unityVisible && !reduced.matches)) return;
    const phrases = unity.querySelectorAll(':scope > span');
    if (reduced.matches) { gsap.set(phrases, { clearProps: 'transform,opacity' }); unityDone = true; return; }
    finalSequence = gsap.timeline({ onComplete: () => { unityDone = true; } });
    finalSequence.fromTo(phrases[0], { x: compact.matches ? -10 : -24, z: -10, opacity: 0 },
      { x: 0, z: 0, opacity: 1, duration: 1, ease: 'power2.inOut' }, 0);
    finalSequence.fromTo(phrases[1], { x: compact.matches ? 10 : 24, z: -10, opacity: 0 },
      { x: 0, z: 0, opacity: 1, duration: 1, ease: 'power2.inOut' }, 0);
    finalSequence.fromTo(phrases[0], { '--unity-shine': '-20%' }, { '--unity-shine': '120%', duration: .8, ease: 'sine.inOut' }, 1);
    finalSequence.fromTo(phrases[1], { '--unity-shine': '-20%' }, { '--unity-shine': '120%', duration: .9, ease: 'sine.inOut' }, 1.6);
  }
  function hoverOut(row) {
    const layer = layers.get(row); if (!layer) return;
    row.classList.remove('is-type-hovered'); layer.sweep?.kill();
    if (hovered === row) hovered = null;
    const duration = reduced.matches ? 0 : .55;
    gsap.to(layer.hover, { y: 0, duration, ease: 'power3.out', overwrite: true });
    gsap.to(layer.title, { z: 0, y: 0, '--type-line': 0, '--type-shine': '120%', duration, ease: 'power3.out', overwrite: true });
    gsap.to(layer.number, { color: layer.numberColor, duration, overwrite: true });
  }
  function hoverIn(row) {
    if (hovered === row || disposed) return;
    if (hovered) hoverOut(hovered);
    hovered = row; row.classList.add('is-type-hovered');
    const layer = layers.get(row);
    if (layer.entrance && !completed.has(layer.index)) layer.entrance.progress(1);
    if (reduced.matches) return;
    gsap.to(layer.hover, { y: -5, duration: .55, ease: 'power3.out', overwrite: true });
    gsap.to(layer.title, { z: 7, y: -.5, '--type-line': 1, duration: .6, ease: 'power3.out', overwrite: true });
    gsap.to(layer.number, { color: '#f6d66b', duration: .5, overwrite: true });
    layer.sweep = gsap.fromTo(layer.title, { '--type-shine': '-20%' }, { '--type-shine': '120%', duration: 1.35, ease: 'sine.inOut' });
  }
  rows.forEach(row => {
    listen(row, 'pointerenter', event => { if (fine.matches && event.pointerType !== 'touch') hoverIn(row); });
    listen(row, 'pointerleave', () => { if (!row.contains(document.activeElement)) hoverOut(row); });
    listen(row, 'focusin', () => hoverIn(row));
    listen(row, 'focusout', event => { if (!row.contains(event.relatedTarget)) hoverOut(row); });
    listen(row, 'pointercancel', () => hoverOut(row));
  });
  const media = gsap.matchMedia();
  media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
    const running = [], triggers = [];
    if (!context.conditions.motion) {
      finalSequence?.kill(); finalSequence = null; unityDone = headingDone = true;
      rows.forEach((row, index) => { completed.add(index); hoverOut(row); });
      gsap.set(unity.children, { clearProps: 'transform,opacity' });
      return;
    }
    const phrases = unity.querySelectorAll(':scope > span');
    if (!unityDone) gsap.set(phrases, { opacity: 0 });
    if (!unityDone) triggers.push(ScrollTrigger.create({ trigger: unity, start: 'top 94%', once: true,
      onEnter: () => { unityVisible = true; finishUnity(); },
    }));
    if (!headingDone) {
      const introSequence = gsap.timeline({ scrollTrigger: { trigger: intro, start: 'top 88%', once: true }, onComplete: () => { headingDone = true; } });
      introSequence.fromTo(eyebrow, { x: -12, opacity: 0 }, { x: 0, opacity: 1, duration: .8, ease: 'power2.out', clearProps: 'transform,opacity' }, 0);
      introSequence.fromTo(heading, { x: () => compact.matches ? -14 : -32, rotationY: () => compact.matches ? -10 : -25, z: -25, opacity: 0 },
        { x: 0, rotationY: 0, z: 0, opacity: 1, duration: 1.4, ease: 'power2.inOut', clearProps: 'transform,opacity' }, .08);
      introSequence.fromTo(heading, { '--intro-line': 0 }, { '--intro-line': 1, duration: 1, ease: 'power2.inOut' }, .55);
      introSequence.fromTo(lead, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power2.out', clearProps: 'transform,opacity' }, .5);
      running.push(introSequence);
    }
    layers.forEach((layer, row) => {
      if (completed.has(layer.index)) return;
      const direction = layer.index % 2 ? 1 : -1;
      const sequence = gsap.timeline({ paused: true, onComplete: () => { completed.add(layer.index); finishUnity(); } });
      layer.entrance = sequence; running.push(sequence);
      sequence.fromTo(row, { x: () => direction * (compact.matches ? 10 : 25), rotationY: () => -direction * (compact.matches ? 5 : 12), z: -14, opacity: 0 },
        { x: 0, rotationY: 0, z: 0, opacity: 1, duration: 1.05, ease: 'power2.inOut', clearProps: 'transform,opacity' }, 0);
      sequence.fromTo(layer.numberLayer, { x: direction * 5, z: -8, opacity: 0 },
        { x: 0, z: 0, opacity: 1, duration: .7, ease: 'power2.out', clearProps: 'transform,opacity' }, .04);
      sequence.fromTo(layer.titleLayer, { x: direction * 8, z: -18, opacity: 0 },
        { x: 0, z: 0, opacity: 1, duration: .9, ease: 'power2.out', clearProps: 'transform,opacity' }, .16);
      if (layer.descriptions.length) sequence.fromTo(layer.descriptions, { y: 6, z: -6, opacity: 0 },
        { y: 0, z: 0, opacity: 1, duration: .85, ease: 'power2.out', clearProps: 'transform,opacity' }, .3);
    });
    const pending = rows.filter(row => !completed.has(layers.get(row).index));
    if (pending.length) triggers.push(...ScrollTrigger.batch(pending, {
      start: 'top 89%', once: true, interval: .1, batchMax: 8,
      onEnter: batch => batch.forEach((row, i) => { const layer = layers.get(row); if (!completed.has(layer.index)) layer.entrance.delay(i * .1).play(); }),
    }));
    else finishUnity();
    return () => {
      running.forEach(animation => { animation.scrollTrigger?.kill(); animation.kill(); });
      triggers.forEach(trigger => trigger.kill()); finalSequence?.kill(); finalSequence = null;
      rows.forEach(row => { const layer = layers.get(row); gsap.killTweensOf([row, layer.numberLayer, layer.titleLayer]); });
    };
  });
  listen(reduced, 'change', () => { if (reduced.matches && hovered) hoverOut(hovered); });
  listen(fine, 'change', () => { if (!fine.matches && hovered) hoverOut(hovered); });
  listen(document, 'visibilitychange', () => { if (document.hidden && hovered) hoverOut(hovered); });
  return () => {
    disposed = true; media.revert(); finalSequence?.kill(); removers.forEach(remove => remove());
    layers.forEach((layer, row) => {
      layer.sweep?.kill(); layer.entrance?.kill();
      gsap.killTweensOf([row, layer.hover, layer.title, layer.number, layer.numberLayer, layer.titleLayer]);
      gsap.set([row, layer.title, layer.number], { clearProps: 'transform,opacity,color' });
      layer.title.style.removeProperty('--type-line'); layer.title.style.removeProperty('--type-shine');
      layer.title.replaceChildren(...layer.titleNodes); layer.title.classList.remove('why-type-title');
      row.replaceChildren(...layer.nodes); row.classList.remove('why-type-row', 'is-type-hovered');
      if (layer.tabindex === null) row.removeAttribute('tabindex'); else row.setAttribute('tabindex', layer.tabindex);
    });
    heading.style.removeProperty('--intro-line'); unity.remove(); section.classList.remove('why-typography');
  };
}
