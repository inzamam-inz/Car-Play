import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves at https://<user>.github.io/<repo>/ — assets must use that base.
// The repo is inzamam-inz/Car-Play, so the deployed path is /Car-Play/.
export default defineConfig({
  base: '/Car-Play/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we ship our own public/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { host: true },
});
