import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

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
          data: ['dexie', '@tanstack/react-query', 'zustand'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.spec.{ts,tsx}'],
    // Los tests de Playwright viven en tests/e2e y no los ejecuta Vitest: son
    // de otro runner y necesitan un navegador.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    css: false,
    /**
     * Los tests de integración montan árboles grandes (un simulacro de 90
     * preguntas, un tablero de PBQ con ocho selects, el panel con varias
     * consultas) y rozan el límite de 5 s por defecto. Se amplía para que el
     * resultado no dependa de la carga de la máquina.
     */
    testTimeout: 15_000,
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
