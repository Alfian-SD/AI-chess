import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Base URL for GitHub Pages subpath deployment.
// Defaults to './' so assets work relatively on any subpath or domain root.
// Can also be configured at build time via Vite CLI: `vite build --base /<repo>/`
export const REPO_BASE = './';

export default defineConfig({
  base: REPO_BASE,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
});
