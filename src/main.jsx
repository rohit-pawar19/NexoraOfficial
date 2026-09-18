import React, { useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import parse from 'html-react-parser';
import home from './content/index.html?raw';
import services from './content/services.html?raw';
import work from './content/work.html?raw';
import reviews from './content/reviews.html?raw';
import contact from './content/contact.html?raw';

const pages = { 'index.html': home, 'services.html': services, 'work.html': work, 'reviews.html': reviews, 'contact.html': contact };
const page = location.pathname.split('/').pop() || 'index.html';

function SitePage() {
  const content = useMemo(() => parse(pages[page] || home), []);

  useEffect(() => {
    let cancelled = false;
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
    return () => { cancelled = true; };
  }, []);

  return content;
}

createRoot(document.getElementById('root')).render(<SitePage />);
