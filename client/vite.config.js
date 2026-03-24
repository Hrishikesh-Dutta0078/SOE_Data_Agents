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
    // Listen on all interfaces so other devices on the LAN can use http://<your-IPv4>:5174
    // (Windows Firewall may need an inbound rule for TCP 5174.)
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://localhost:5005',
        changeOrigin: true,
        secure: false,
      },
      '/login': { target: 'https://localhost:5005', changeOrigin: true, secure: false },
      '/logout': { target: 'https://localhost:5005', changeOrigin: true, secure: false },
      '/implicit/callback': { target: 'https://localhost:5005', changeOrigin: true, secure: false },
    },
  },
});
