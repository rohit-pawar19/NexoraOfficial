import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import parse from 'html-react-parser';
import './hero/hero-tagline.css';
import './hero/hero.css';
import { loadHeroWhenVisible } from './hero/load-hero.js';
import { initSiteMotion } from './motion/site-motion.js';
import { initNavbarGlass } from './navbar/navbar-glass.js';
import { initAboutDepth } from './about/about-depth.js';
import { initServiceDepth } from './services/service-depth.js';
import { initIndustryWorlds } from './industries/industry-worlds.js';
import { initProcessJourney } from './process/process-journey.js';
import { initWhyTypography } from './why/why-typography.js';
import { initContactFooterMotion } from './motion/contact-footer.js';
import { initLiquidGold } from './motion/liquid-gold.js';

const pages = {
  'index.html': () => import('./content/index.html?raw'),
  'services.html': () => import('./content/services.html?raw'),
  'work.html': () => import('./content/work.html?raw'),
  'reviews.html': () => import('./content/reviews.html?raw'),
  'contact.html': () => import('./content/contact.html?raw'),
};
const page = location.pathname.split('/').pop() || 'index.html';

function SitePage({ markup }) {
  const content = useMemo(() => parse(markup), [markup]);

  useLayoutEffect(() => {
    try {
      return loadHeroWhenVisible();
    } finally {
      document.documentElement.classList.remove('brand-intro-boot');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let disposeGallery;
    let disposeClients;
    const disposeNavbar = initNavbarGlass();
    if (page === 'services.html' && location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target?.matches('.service-card[id]')) target.scrollIntoView({ behavior: 'instant' });
    }
    const disposeAbout = initAboutDepth();
    const disposeServices = initServiceDepth();
    const disposeIndustries = initIndustryWorlds();
    const disposeProcess = initProcessJourney();
    const disposeWhy = initWhyTypography();
    const disposeContactFooter = initContactFooterMotion();
    const disposeLiquidGold = initLiquidGold();
    const disposeMotion = initSiteMotion();
    if (page === 'index.html' && ['#about', '#process'].includes(location.hash) &&
        performance.getEntriesByType('navigation')[0]?.type === 'navigate') {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
    }
    if (page === 'work.html') {
      import('./work/spatial-gallery.js').then(({ initSpatialGallery }) => {
        if (!cancelled) disposeGallery = initSpatialGallery();
      }).catch(console.error);
      import('./work/client-showcase.js').then(({ initClientShowcase }) => {
        if (!cancelled) disposeClients = initClientShowcase();
      }).catch(console.error);
    }
    async function initialize() {
      const scripts = ['/js/script.js'];
      if (page === 'work.html') scripts.push('/js/work.js');
      if (page === 'reviews.html') scripts.push('/js/reviews.js');
      for (const src of scripts) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.body.append(script);
        });
        if (cancelled) return;
      }
      document.dispatchEvent(new Event('nexora:page-ready'));
    }
    initialize().catch(console.error);
    return () => {
      cancelled = true;
      disposeMotion();
      disposeGallery?.();
      disposeClients?.();
      disposeNavbar();
      disposeAbout();
      disposeServices();
      disposeIndustries();
      disposeProcess();
      disposeWhy();
      disposeContactFooter();
      disposeLiquidGold();
    };
  }, []);

  return content;
}

(Object.prototype.hasOwnProperty.call(pages, page) ? pages[page] : pages['index.html'])()
  .then(({ default: markup }) => createRoot(document.getElementById('root')).render(<SitePage markup={markup} />))
  .catch(console.error);
