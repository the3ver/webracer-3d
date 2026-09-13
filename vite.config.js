import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
});
