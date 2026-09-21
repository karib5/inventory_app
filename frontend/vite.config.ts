import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local/demo config: lets the app be served through a Cloudflare Quick Tunnel
// pointed at this dev server, with API calls proxied to the local FastAPI
// backend so the browser never needs to know the backend's address.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Quick Tunnel hands out a new random *.trycloudflare.com subdomain
    // every run, so allow the whole subdomain instead of one fixed host.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
