import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de los tests end-to-end.
 *
 * Se prueba el bundle REAL (`vite preview` sobre `dist`), no el servidor de
 * desarrollo: el troceado por rutas y la minificación solo se ejercitan así, y
 * son justo los cambios que los tests unitarios no pueden ver.
 *
 * Requiere haber instalado el navegador una vez:
 *   npx playwright install chromium
 */

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // La interfaz y el contenido están en español: se fija el idioma del
    // navegador para que la aplicación no resuelva otro por defecto.
    locale: 'es-ES',
  },

  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /smoke\.spec\.ts/,
    },
    {
      name: 'movil',
      use: { ...devices['Pixel 7'] },
      testMatch: /smoke\.spec\.ts/,
    },
  ],

  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
