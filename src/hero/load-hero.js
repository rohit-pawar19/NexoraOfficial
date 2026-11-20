export function loadHeroWhenVisible() {
  const hero = document.querySelector('#home.home-intro');
  const host = hero?.querySelector('.logo-animation');
  if (!host) return () => {};
  if (!('IntersectionObserver' in window)) {
    host.classList.remove('ribbon-pending');
    return () => {};
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const { signal } = listeners;
  let visible = false;
  let loading = false;
  let mount;
  let dispose;

  function ensure() {
    if (signal.aborted || !visible || document.hidden || reduced.matches || loading || dispose) return;
    loading = true;
    (mount ? Promise.resolve(mount) : import('./hero-scene.js').then(({ initHero }) => initHero)).then(initHero => {
      loading = false;
      mount = initHero;
      if (signal.aborted || !visible || document.hidden || reduced.matches) return;
      observer.disconnect();
      dispose = mount();
    }).catch(error => {
      observer.disconnect();
      if (signal.aborted) return;
      host.classList.remove('ribbon-pending');
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

  return () => {
    listeners.abort();
    observer.disconnect();
    dispose?.();
  };
}
