import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // Use on docker/wsl
      interval: 100 // Polling interval
    },
    hmr: {
      overlay: true
    }
  }
});