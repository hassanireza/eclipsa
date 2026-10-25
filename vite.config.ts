import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://<user>.github.io/eclipsa/ on GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: '/eclipsa/',
  worker: { format: 'es' },
  build: { target: 'es2022' },
});
