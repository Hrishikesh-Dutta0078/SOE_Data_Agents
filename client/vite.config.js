import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/login': { target: 'https://localhost:5000', changeOrigin: true, secure: false },
      '/logout': { target: 'https://localhost:5000', changeOrigin: true, secure: false },
      '/implicit/callback': { target: 'https://localhost:5000', changeOrigin: true, secure: false },
    },
  },
});
