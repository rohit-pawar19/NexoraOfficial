import { canRenderGraphics, graphicsProfile, watchGraphics } from '../motion/graphics-budget.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './process-journey.css';
import { selectProcessStage } from './process-stage-state.js';

gsap.registerPlugin(ScrollTrigger);

export function initProcessJourney() {
  const section = document.querySelector('#process');
  const grid = section?.querySelector('.process-grid');
  if (!grid) return () => {};
  const items = [...grid.querySelectorAll('.process-item')];
  if (items.length !== 8) return () => {};

  const wide = matchMedia('(min-width: 768px)');
  let dispose;
  function updateLayout() {
    dispose?.();
    dispose = undefined;
    if (!('IntersectionObserver' in window)) return;
    dispose = wide.matches ? initProcessTunnel(section, grid, items) : initProcessCards(grid, items);
  }
  wide.addEventListener('change', updateLayout);
  updateLayout();
  return () => {
    wide.removeEventListener('change', updateLayout);
    dispose?.();
  };
}

function initProcessCards(grid, items) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  const setCardsInView = visible => document.body.classList.toggle('process-cards-in-view', visible);
  function clearAnimations() {
    for (const animation of animations) animation.cancel();
    animations.clear();
  }
  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (target === grid) {
        setCardsInView(isIntersecting);
        continue;
      }
      if (!isIntersecting || reduced.matches || !target.animate) continue;
      observer.unobserve(target);
      // Cards remain visible by default, including before the observer runs.
      const animation = target.animate([
        { opacity: .55, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 420, easing: 'ease-out' });
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    }
  });
  observer.observe(grid);
  items.forEach(item => observer.observe(item));
  reduced.addEventListener('change', clearAnimations);
  return () => {
    observer.disconnect();
    clearAnimations();
    reduced.removeEventListener('change', clearAnimations);
    setCardsInView(false);
  };
}

function initProcessTunnel(section, grid, items) {
  const names = items.map(item => item.querySelector('h3').textContent);
  const route = document.createElement('div'); route.className = 'process-route';
  const panel = document.createElement('div'); panel.className = 'process-panel';
  const viewport = document.createElement('div'); viewport.className = 'process-viewport'; viewport.setAttribute('aria-hidden', 'true');
  viewport.innerHTML = `<div class="process-corridor-fallback">${items.map((_, i) => `<i style="--frame:${i}"></i>`).join('')}</div>`;
  const meter = document.createElement('div'); meter.className = 'process-progress';
  meter.setAttribute('role', 'progressbar'); meter.setAttribute('aria-label', 'Nexora process journey');
  meter.setAttribute('aria-valuemin', '1'); meter.setAttribute('aria-valuemax', '8');
  const label = document.createElement('div'); label.className = 'process-progress-label'; label.setAttribute('aria-hidden', 'true');
  const track = document.createElement('div'); track.className = 'process-progress-track';
  const fill = document.createElement('div'); fill.className = 'process-progress-fill'; track.append(fill); meter.append(label, track);
  panel.append(viewport, meter); grid.before(route); route.append(panel, grid); section.classList.add('process-journey');
  const media = gsap.matchMedia();
  let disposed = false, corridor = null, loading = false, failed = false, visible = false, motionAllowed = false, cinematic = false, active = -1, epoch = 0;
  let approaching = false, corridorModule;
  const state = { progress: 0 };
  function activate(index, animate) {
    if (index === active) return;
    active = index;
    items.forEach((item, i) => {
      item.classList.toggle('is-process-active', i === index);
      if (i === index) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
    label.textContent = `${String(index + 1).padStart(2, '0')} / 08 — ${names[index]}`;
    meter.setAttribute('aria-valuenow', String(index + 1)); meter.setAttribute('aria-valuetext', `${index + 1} of 8: ${names[index]}`);
    if (animate) {
      gsap.fromTo(items[index].querySelectorAll('h3, p'), { y: 9, opacity: .45, rotationX: 3 }, {
        y: 0, opacity: 1, rotationX: 0, transformPerspective: 900, duration: .65,
        stagger: .08, ease: 'power2.out', overwrite: true, clearProps: 'transform,opacity',
      });
    }
  }
  function paint() {
    activate(selectProcessStage(state.progress, active), cinematic && visible && !document.hidden);
    fill.style.transform = `scaleX(${(.08 + state.progress * .92).toFixed(4)})`;
    if (visible && !document.hidden) corridor?.render(state.progress, active);
  }
  function permitted() {
    return 'ResizeObserver' in window && canRenderGraphics() && graphicsProfile().level !== 'low';
  }
  function releaseCorridor() {
    corridor?.dispose();
    corridor = null;
  }
  function failCorridor(error) {
    if (disposed || failed) return;
    failed = true;
    releaseCorridor();
    if (error instanceof Error) console.warn('Process journey using perspective fallback.', error);
  }
  function loadCorridor() {
    corridorModule ??= import('./process-corridor.js');
    return corridorModule;
  }
  function ensure() {
    if (!motionAllowed || !visible || document.hidden || disposed || corridor || loading || failed || !permitted()) return;
    loading = true; const token = epoch;
    loadCorridor().then(({ mountProcessCorridor }) => {
      loading = false;
      if (token !== epoch) { ensure(); return; }
      if (disposed || !motionAllowed || !visible || document.hidden || !permitted()) return;
      corridor = mountProcessCorridor(viewport, state.progress, active, failCorridor); corridor.setVisible(visible && !document.hidden); paint();
    }).catch(error => { loading = false; failCorridor(error); });
  }
  function prepareCorridor() {
    if (approaching && motionAllowed && !document.hidden && !disposed && !failed && !corridorModule && permitted()) {
      loadCorridor().catch(failCorridor);
    }
    ensure();
  }
  media.add({ desktop: '(min-width: 992px)', motion: '(prefers-reduced-motion: no-preference)' }, context => {
    motionAllowed = context.conditions.motion;
    cinematic = context.conditions.desktop && motionAllowed;
    section.classList.toggle('process-cinematic', cinematic);
    active = -1;
    const triggers = [];
    let travel;
    if (cinematic) {
      state.progress = 0;
      // Native sticky positioning provides the viewing area. No pin, snap, wheel
      // interception or programmatic scroll is used by this journey.
      travel = gsap.to(state, { progress: 1, ease: 'none', onUpdate: paint, scrollTrigger: {
        trigger: grid,
        start: () => `top+=${items[0].offsetHeight / 2} 50%`,
        end: () => `bottom-=${items[7].offsetHeight / 2} 50%`,
        scrub: .85, invalidateOnRefresh: true,
      } });
    } else {
      items.forEach((item, index) => {
        const select = () => { state.progress = index / 7; paint(); };
        triggers.push(ScrollTrigger.create({ trigger: item, start: 'top 65%', end: 'bottom 35%', onEnter: select, onEnterBack: select }));
      });
    }
    prepareCorridor();
    paint();
    return () => {
      epoch++; motionAllowed = cinematic = false; travel?.scrollTrigger?.kill(); travel?.kill(); triggers.forEach(trigger => trigger.kill());
      corridor?.dispose(); corridor = null;
      items.forEach(item => {
        const text = item.querySelectorAll('h3, p'); gsap.killTweensOf(text); gsap.set(text, { clearProps: 'transform,opacity' });
      });
      section.classList.remove('process-cinematic');
    };
  });
  const observer = new IntersectionObserver(([entry]) => {
    const entering = !visible && entry.isIntersecting;
    visible = entry.isIntersecting;
    corridor?.setVisible(visible && !document.hidden);
    if (entering) active = -1;
    if (visible) { ensure(); paint(); }
  });
  observer.observe(viewport);
  // Fetch the module while the visitor approaches. WebGL still starts in view.
  const preloadObserver = new IntersectionObserver(([entry]) => {
    approaching = entry.isIntersecting;
    if (approaching) prepareCorridor();
  }, { rootMargin: '1200px 0px' });
  preloadObserver.observe(viewport);
  const visibility = () => { corridor?.setVisible(visible && !document.hidden); if (!document.hidden) { prepareCorridor(); paint(); } };
  const unwatch = watchGraphics(() => { if (!permitted()) releaseCorridor(); });
  document.addEventListener('nexora:intro-finished', prepareCorridor);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    unwatch(); document.removeEventListener('nexora:intro-finished', prepareCorridor);
    disposed = true; media.revert(); observer.disconnect(); preloadObserver.disconnect(); document.removeEventListener('visibilitychange', visibility);
    corridor?.dispose(); route.before(grid); route.remove(); section.classList.remove('process-journey', 'process-cinematic');
    items.forEach(item => { item.classList.remove('is-process-active'); item.removeAttribute('aria-current'); });
  };
}
