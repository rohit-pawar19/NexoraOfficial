import { createHeroIntro } from './hero-intro.js';
import { graphicsProfile, graphicsExhausted } from '../motion/graphics-budget.js';

export function loadHeroWhenVisible() {
  const hero = document.querySelector('#home.home-intro');
  const host = hero?.querySelector('.logo-animation');
  const artwork = host?.querySelector('.hero-artwork');
  if (!artwork || !('IntersectionObserver' in window) || !('ResizeObserver' in window)) return () => {};

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const intro = reduced.matches ? undefined : createHeroIntro(host, artwork, reduced);
  let visible = false;
  let loading = false;
  let failed = false;
  let cancelled = false;
  let dispose;

  function shouldMount() {
    if (cancelled || document.hidden || reduced.matches || graphicsExhausted() || !(intro?.active || visible)) return false;
    const profile = graphicsProfile();
    return Boolean(profile && (!intro?.active || profile.level !== 'low'));
  }

  function ensure() {
    if (failed || loading || dispose || !shouldMount()) return;
    loading = true;
    import('./hero-scene.js').then(({ initHero }) => {
      loading = false;
      if (!shouldMount()) return;
      dispose = initHero({ hero, host, artwork, intro });
    }).catch(error => {
      if (cancelled) return;
      failed = true;
      artwork.classList.remove('ribbon-pending', 'ribbon-ready');
      artwork.querySelector('canvas')?.remove();
      intro?.fail();
      console.warn('The 3D hero artwork could not initialize.', error);
    });
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    artwork.classList.toggle('hero-artwork-visible', visible);
    ensure();
  });
  observer.observe(host);
  reduced.addEventListener('change', ensure);
  document.addEventListener('visibilitychange', ensure);
  intro?.finished.then(ensure);
  const introProfile = intro?.active ? graphicsProfile() : undefined;
  if (intro?.active && (!introProfile || introProfile.level === 'low')) intro.runLightweight();
  else ensure();

  return () => {
    cancelled = true;
    observer.disconnect();
    artwork.classList.remove('hero-artwork-visible');
    reduced.removeEventListener('change', ensure);
    document.removeEventListener('visibilitychange', ensure);
    intro?.dispose();
    dispose?.();
  };
}
