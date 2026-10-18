import { expect, test } from '@playwright/test';

/**
 * Flujos de estudio de punta a punta, sobre el bundle real.
 *
 * Estos tests existen porque los unitarios no pueden ver lo que pasa en un
 * navegador: que una ruta diferida cargue, que el foco y el desplazamiento se
 * gestionen, o que el contenido se siembre en IndexedDB al arrancar.
 */

test.describe('repaso espaciado', () => {
  test('plan, confianza, revelado y calificación', async ({ page }) => {
    await page.goto('/review');

    // El plan de sesión se calcula desde IndexedDB.
    await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible();
    await expect(page.getByText(/tarjetas · ~\d+ min/)).toBeVisible();

    await page.getByRole('button', { name: /empezar sesión/i }).click();

    // La barra de progreso empieza en la primera tarjeta.
    await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible();
    await expect(page.getByText('Antes de ver la respuesta: ¿lo tenías?')).toBeVisible();

    // Declarar la confianza revela en el mismo gesto.
    await page.getByRole('button', { name: 'Lo tenía seguro' }).click();
    await expect(page.getByRole('heading', { name: 'Respuesta' })).toBeVisible();

    await page.getByRole('button', { name: /^Bien/ }).click();

    // La sesión avanza a la siguiente tarjeta.
    await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
    await expect(page.getByText('Antes de ver la respuesta: ¿lo tenías?')).toBeVisible();
  });

  test('permite revelar sin valorar la confianza', async ({ page }) => {
    await page.goto('/review');
    await page.getByRole('button', { name: /empezar sesión/i }).click();

    await page.getByRole('button', { name: /revelar sin valorar/i }).click();
    await expect(page.getByRole('heading', { name: 'Respuesta' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Otra vez/ })).toBeVisible();
  });
});

test.describe('microlearning', () => {
  test('recorre una lección completa hasta el resultado', async ({ page }) => {
    await page.goto('/lessons');
    // Se ancla al catálogo y no a las recomendaciones: cuál aparece primero
    // depende de si la consulta de recomendaciones ha resuelto, y eso hacía el
    // test intermitente.
    await page
      .getByRole('region', { name: 'Todas las lecciones' })
      .getByRole('link')
      .first()
      .click();

    await expect(page.getByText(/^Paso 1 de \d+$/)).toBeVisible();

    // Se recorre la lección respondiendo la primera opción de cada decisión.
    for (let step = 0; step < 30; step += 1) {
      if ((await page.getByRole('button', { name: 'Repetir lección' }).count()) > 0) break;

      const finalize = page.getByRole('button', { name: 'Finalizar lección' });
      if ((await finalize.count()) > 0) {
        await finalize.click();
        continue;
      }

      const next = page.getByRole('button', { name: 'Continuar' });
      if ((await next.count()) > 0) {
        await next.click();
        continue;
      }

      const check = page.getByRole('button', { name: 'Comprobar' });
      if ((await check.count()) > 0) {
        await page.locator('fieldset input:not([disabled])').first().click();
        await check.click();
        // La corrección es asíncrona: se espera al veredicto antes de seguir.
        await expect(page.getByText(/correcto|no era la mejor opción/i)).toBeVisible();
        continue;
      }

      const reveal = page.getByRole('button', { name: 'Ver explicación' });
      if ((await reveal.count()) > 0) {
        await reveal.click();
        await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
        continue;
      }

      break;
    }

    await expect(page.getByText(/lección (superada|no superada)/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ideas clave' })).toBeVisible();
  });
});

test.describe('PBQ', () => {
  test('topología: se resuelve con el selector accesible', async ({ page }) => {
    await page.goto('/pbq/pbq-segmentar-red-plana');
    await expect(page.getByRole('heading', { name: 'Segmentar una red plana' })).toBeVisible();

    // Colocación correcta de los ocho activos (la misma que usa el test del motor).
    const placement: Record<string, string> = {
      'Servidor web público': 'dmz',
      'Servidor de correo entrante': 'dmz',
      'Base de datos de clientes': 'interna',
      'Controlador de dominio': 'interna',
      'Puesto de trabajo de finanzas': 'interna',
      'Host de salto (bastion)': 'gestion',
      'Cámaras IP': 'iot',
      'Impresora de red antigua': 'iot',
    };

    for (const [label, zone] of Object.entries(placement)) {
      await page.getByLabel(`Zona de ${label}`).selectOption(zone);
    }

    await expect(page.getByText('8/8 colocados')).toBeVisible();
    await page.getByRole('button', { name: 'Comprobar' }).click();

    await expect(page.getByText('Superada')).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Por qué' })).toBeVisible();
  });

  test('terminal: ejecuta un comando y avanza el objetivo', async ({ page }) => {
    await page.goto('/pbq/pbq-triaje-host-comprometido');
    await expect(page.getByRole('heading', { name: 'Triaje de un host comprometido' })).toBeVisible();

    const terminal = page.locator('[role="application"]');
    await terminal.click();
    await page.keyboard.type('help');
    await page.keyboard.press('Enter');

    // La salida del comando aparece en el terminal simulado.
    await expect(terminal).toContainText('Comandos disponibles');
    await expect(page.getByRole('button', { name: 'Comprobar' })).toBeEnabled();
  });
});
