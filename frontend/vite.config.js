import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the OceanShield AI frontend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Proxy API calls to the Express backend during development to avoid CORS issues.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy AI service calls when used directly from the browser.
      '/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ai/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
