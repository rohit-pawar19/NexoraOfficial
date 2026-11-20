const { defineConfig } = require('vite');
const { resolve } = require('node:path');
const { cp, mkdir } = require('node:fs/promises');
const express = require('express');
const reviews = require('./reviews');

const root = __dirname;
const pages = ['index', 'services', 'work', 'reviews', 'contact'];

function mountReviews(server) {
  const app = express();
  app.use(express.json());
  app.use('/api/reviews', reviews(resolve(root, 'data/reviews.json')));
  server.middlewares.use(app);
}

module.exports = defineConfig({
  appType: 'mpa',
  optimizeDeps: {
    include: ['three', 'three/addons/environments/RoomEnvironment.js', 'gsap', 'gsap/ScrollTrigger'],
  },
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map(name => [name, resolve(root, `${name}.html`)])),
    },
  },
  plugins: [{
    name: 'nexora-static-assets',
    configureServer: mountReviews,
    configurePreviewServer: mountReviews,
    async closeBundle() {
      const out = resolve(root, 'dist');
      for (const folder of ['css', 'js', 'images']) {
        await mkdir(resolve(out, folder), { recursive: true });
        await cp(resolve(root, folder), resolve(out, folder), {
          recursive: true,
          filter: source => folder !== 'images' || (!source.endsWith('.png') && !source.endsWith('.txt') && !source.endsWith('VTOP_Velesta_walkthrough.MOV.mp4')),
        });
      }
    },
  }],
});
