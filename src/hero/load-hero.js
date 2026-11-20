export function loadHeroWhenVisible() {
  const hero = document.querySelector('#home.home-intro');
  if (!hero || !('IntersectionObserver' in window)) return () => {};

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const { signal } = listeners;
  let visible = false;
  let loading = false;
  let mount;
  let dispose;

  function ensure() {
    if (signal.aborted || !visible || document.hidden || reduced.matches || loading || dispose) return;
    if (mount) {
      dispose = mount();
      observer.disconnect();
      return;
    }
    loading = true;
    import('./hero-scene.js').then(({ initHero }) => {
      loading = false;
      mount = initHero;
      ensure();
    }).catch(error => {
      observer.disconnect();
      console.warn('Hero artwork using the existing SVG fallback.', error);
    });
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    ensure();
  });
  observer.observe(hero);
  reduced.addEventListener('change', ensure, { signal });
  document.addEventListener('visibilitychange', ensure, { signal });

  return () => {
    listeners.abort();
    observer.disconnect();
    dispose?.();
  };
}
