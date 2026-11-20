import { createHeroIntro } from './hero-intro.js';

export function loadHeroWhenVisible() {
  const hero = document.querySelector('#home.home-intro');
  const host = hero?.querySelector('.logo-animation');
  const artwork = host?.querySelector('.hero-artwork');
  if (!artwork) return () => {};
  if (!('IntersectionObserver' in window) || !('ResizeObserver' in window)) {
    artwork.classList.remove('ribbon-pending');
    return () => {};
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const intro = createHeroIntro(host, artwork, reduced);
  const listeners = new AbortController();
  const { signal } = listeners;
  let visible = false;
  let loading = false;
  let mount;
  let dispose;

  function shouldMount() {
    return !signal.aborted && !document.hidden
      && (intro?.active || (visible && !reduced.matches));
  }

  function ensure() {
    if (!shouldMount() || loading || dispose) return;
    loading = true;
    (mount ? Promise.resolve(mount) : import('./hero-scene.js').then(({ initHero }) => initHero)).then(initHero => {
      loading = false;
      mount = initHero;
      if (!shouldMount()) return;
      observer.disconnect();
      dispose = mount({ hero, host, artwork, intro });
    }).catch(error => {
      observer.disconnect();
      if (signal.aborted) return;
      artwork.classList.remove('ribbon-pending');
      intro?.fail();
      console.warn('The 3D hero artwork could not initialize.', error);
    });
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    ensure();
  });
  observer.observe(hero);
  reduced.addEventListener('change', ensure, { signal });
  document.addEventListener('visibilitychange', ensure, { signal });
  ensure();

  return () => {
    listeners.abort();
    observer.disconnect();
    intro?.dispose();
    dispose?.();
  };
}
