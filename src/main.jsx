import React, { useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import parse from 'html-react-parser';
import home from './content/index.html?raw';
import services from './content/services.html?raw';
import work from './content/work.html?raw';
import reviews from './content/reviews.html?raw';
import contact from './content/contact.html?raw';
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

const pages = { 'index.html': home, 'services.html': services, 'work.html': work, 'reviews.html': reviews, 'contact.html': contact };
const page = location.pathname.split('/').pop() || 'index.html';

function SitePage() {
  const content = useMemo(() => parse(pages[page] || home), []);

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
    const disposeHero = loadHeroWhenVisible();
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
      document.dispatchEvent(new Event('DOMContentLoaded'));
    }
    initialize().catch(console.error);
    return () => {
      cancelled = true;
      disposeHero();
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

createRoot(document.getElementById('root')).render(<SitePage />);
