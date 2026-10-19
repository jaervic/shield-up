import { expect, test } from '@playwright/test';

/**
 * Humo en móvil: se ejecuta en el proyecto `movil` (Pixel 7).
 *
 * No comprueba el aspecto, sino que la aplicación es usable con la barra
 * inferior y que el contenido largo no rompe la navegación.
 */

test('la barra inferior navega entre secciones', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Panel de estudio' })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Navegación principal' });

  await nav.getByRole('link', { name: 'Repaso' }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible();

  await nav.getByRole('link', { name: 'Evaluación' }).click();
  await expect(page).toHaveURL(/\/evaluation$/);
  await expect(page.getByRole('heading', { name: 'Evaluación', level: 1 })).toBeVisible();

  // El hub agrupa diagnóstico, simulacro y PBQ manteniendo la barra en 4 ítems.
  await page.getByRole('link', { name: 'Ver simulaciones' }).click();
  await expect(page).toHaveURL(/\/pbq$/);
  await expect(page.getByRole('heading', { name: 'Simulaciones' })).toBeVisible();

  await nav.getByRole('link', { name: 'Panel' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('la página no se desplaza en horizontal', async ({ page }) => {
  for (const route of ['/', '/review', '/lessons', '/exam', '/settings']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(overflow, `${route} desborda en horizontal`).toBeLessThanOrEqual(1);
  }
});

test('el modo concentración mantiene la navegación accesible', async ({ page }) => {
  await page.goto('/review');
  await page.getByRole('button', { name: /empezar sesión/i }).click();

  // Durante la sesión la cabecera deja de ser fija, pero la navegación sigue.
  await expect(page.getByText('Antes de ver la respuesta: ¿lo tenías?')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
});
