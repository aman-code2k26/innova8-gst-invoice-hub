import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Builds straight into the repository root so GitHub Pages (source: main + /)
   keeps serving the app without an extra deploy step. */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../',
    emptyOutDir: false,
    assetsDir: 'assets',
    sourcemap: false
  }
});
