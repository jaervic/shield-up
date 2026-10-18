import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test.describe('simulador de examen', () => {
  test('responde, entrega con confirmación y muestra el resultado', async ({ page }) => {
    await page.goto('/exam');

    await expect(page.getByRole('heading', { name: 'Simulador de examen' })).toBeVisible();
    await expect(page.getByText('Aprobado').locator('..')).toContainText('750/900');

    await page.getByRole('button', { name: /comenzar simulacro/i }).click();

    // El cronómetro arranca y la primera pregunta está en pantalla.
    await expect(page.getByRole('timer')).toBeVisible();
    await expect(page.getByText('Pregunta 1 de 90')).toBeVisible();

    await page.locator('fieldset input').first().check();

    // Ir a la última por el navegador de preguntas.
    await page.getByRole('button', { name: /^Pregunta 90,/ }).click();
    await expect(page.getByText('Pregunta 90 de 90')).toBeVisible();

    // La entrega no es inmediata: primero resume lo que queda pendiente.
    await page.getByRole('button', { name: 'Entregar' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Confirmar entrega' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('89');

    await page.getByRole('button', { name: /entregar ahora/i }).click();

    await expect(page.getByRole('heading', { name: 'Simulacro terminado' })).toBeVisible();
    await expect(page.getByText('Puntuación').locator('..')).toContainText('/900');
    await expect(page.getByText('Se aprueba con 750/900.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Por dominio' })).toBeVisible();
  });
});

test.describe('copia de seguridad', () => {
  test('exporta el progreso y lo vuelve a importar', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();

    // El mazo se siembra al arrancar: se espera a que haya tarjetas de verdad.
    await expect(page.getByText(/\d+ tarjetas/)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar copia' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();

    // El fichero descargado es una copia válida y con contenido.
    const raw = await readFile(path as string, 'utf8');
    const backup = JSON.parse(raw) as { app: string; version: number; cards: unknown[] };
    expect(backup.app).toBe('shieldup');
    expect(backup.version).toBe(1);
    expect(backup.cards.length).toBeGreaterThan(40);

    // Se importa el mismo fichero y se confirma la sustitución.
    await page.locator('input[type="file"]').setInputFiles(path as string);
    await expect(page.getByText(/la copia es del/i)).toBeVisible();
    await expect(page.getByText(/sustituye todo tu progreso/i)).toBeVisible();

    await page.getByRole('button', { name: /sustituir mi progreso/i }).click();
    await expect(page.getByText('Copia restaurada.')).toBeVisible();
  });

  test('el reinicio exige escribir la confirmación', async ({ page }) => {
    await page.goto('/settings');

    const reset = page.getByRole('button', { name: /reiniciar todo el progreso/i });
    await expect(reset).toBeDisabled();

    await page.getByLabel(/escribe REINICIAR/i).fill('REINICIAR');
    await expect(reset).toBeEnabled();
  });
});
