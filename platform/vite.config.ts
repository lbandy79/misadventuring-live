import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite config for the unified MTP platform app.
 *
 * Phase 4 scaffold — runs alongside the existing live show app
 * (misadventuring-live-starter) in the same repo so we can share
 * node_modules and src/lib without npm workspaces gymnastics.
 *
 * Run with:
 *   npm run dev:platform   - dev server on port 3001
 *   npm run build:platform - emits to dist-platform/
 */
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, '../public'),
  server: {
    port: 3001,
    open: true,
  },
  resolve: {
    alias: {
      // Reach back into the live-show app's shared lib (Phase 2-3 work).
      '@mtp/lib': path.resolve(__dirname, '../src/lib'),
      '@mtp/firebase': path.resolve(__dirname, '../src/firebase.ts'),
      '@mtp/themes': path.resolve(__dirname, '../src/themes'),
    },
  },
  build: {
    // Default to platform/dist so Vercel (with Root Directory = platform/)
    // finds the output without escaping the root. Override via VITE_PLATFORM_OUT_DIR
    // if you need the legacy ../dist-platform path locally.
    outDir: process.env.VITE_PLATFORM_OUT_DIR
      ? path.resolve(process.cwd(), process.env.VITE_PLATFORM_OUT_DIR)
      : path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  // Inherit env from the parent project (.env.local at repo root).
  envDir: path.resolve(__dirname, '..'),
});
