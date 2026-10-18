import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa el vendor para que el bundle principal no supere el límite de aviso.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['dexie', 'dexie-react-hooks', '@tanstack/react-query', 'zustand'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.spec.{ts,tsx}'],
    css: false,
    alias: {
      // xterm llama a `canvas.getContext` al importarse y jsdom no lo
      // implementa: en tests se sustituye por un doble que registra lo escrito.
      '@xterm/xterm': fileURLToPath(new URL('./tests/stubs/xterm.ts', import.meta.url)),
      '@xterm/addon-fit': fileURLToPath(
        new URL('./tests/stubs/xterm-addon-fit.ts', import.meta.url),
      ),
    },
  },
});
