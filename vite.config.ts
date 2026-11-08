import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false,
    watch: {
      // Raw dumps and offline tools are not runtime inputs.
      ignored: ['**/rawdata/**', '**/tools/**'],
    },
  },
  optimizeDeps: {
    // Avoid searching the large local asset dump for HTML entry points.
    entries: ['index.html'],
  },
  build: {
    target: 'esnext',
  },
});
