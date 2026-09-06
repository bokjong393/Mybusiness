import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH lets the same source deploy to a Vercel root ("/") and to a
// GitHub Pages subpath ("/Mybusiness/sapa/") without a code change.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
  build: { outDir: 'dist', sourcemap: false }
});
