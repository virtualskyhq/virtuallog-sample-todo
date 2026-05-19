import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    port: 5173,
    proxy: {
      // Regex anchor + trailing slash so the proxy only catches API routes
      // like /api/todos and NOT source files such as /api.ts (which Vite
      // serves from the client/ folder during dev).
      '^/api/': 'http://localhost:3000',
    },
  },
  build: {
    outDir: path.resolve(__dirname, '..', 'public'),
    emptyOutDir: true,
  },
});
