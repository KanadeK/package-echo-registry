import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/package-echo-registry/' : '/',
  build: {
    cssMinify: 'esbuild',
    sourcemap: true,
  },
  plugins: [react()],
});
