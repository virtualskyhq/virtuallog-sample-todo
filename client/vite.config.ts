import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  envDir: path.resolve(__dirname, '..'),
  // Widen the env prefix beyond the default `VITE_` so the same VIRTUALLOG_*
  // variables drive both the Express server (via process.env) and the React
  // app (via import.meta.env). Anything matching these prefixes is baked
  // into the public JS bundle at build time — set them only with values you
  // are happy to ship to the browser. In a real app where the API key is a
  // server-only secret, keep envPrefix at the default and proxy log POSTs
  // through your own backend instead.
  envPrefix: ['VITE_', 'VIRTUALLOG_'],
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
