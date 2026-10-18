/**
 * Capturas de pantalla para revisión visual.
 *
 * Uso:
 *   npm run dev            (en otra terminal)
 *   npm run shots          (por defecto contra http://localhost:5173)
 *
 * Variables: BASE_URL, OUT_DIR, THEME_FILTER
 *
 * Requiere haber instalado el navegador una vez: `npx playwright install chromium`.
 * No forma parte de la suite de tests: es una herramienta de revisión manual.
 */

import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = process.env.OUT_DIR ?? 'screenshots';

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

mkdirSync(OUT_DIR, { recursive: true });

/** Siembra historial sintético para que el panel tenga datos que mostrar. */
async function seedHistory(page) {
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('shieldup');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const readAll = (store) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(store, 'readonly').objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

    const cards = await readAll('cards');
    if (cards.length === 0) return;

    const reviews = [];
    const confidences = ['sure', 'sure', 'unsure'];
    let counter = 0;

    // Actividad repartida en las últimas 6 semanas, con huecos realistas.
    for (let daysAgo = 0; daysAgo < 42; daysAgo += 1) {
      const perDay = daysAgo % 7 === 3 ? 0 : (daysAgo % 5) + (daysAgo % 3);
      for (let i = 0; i < perDay; i += 1) {
        counter += 1;
        const card = cards[counter % cards.length];
        const correct = counter % 5 !== 0;
        const reviewedAt = new Date(Date.now() - daysAgo * 86_400_000 - i * 60_000);
        reviews.push({
          id: `seed-${counter}`,
          cardId: card.id,
          reviewedAt: reviewedAt.toISOString(),
          grade: correct ? 'good' : 'again',
          score: correct ? 4 : 0,
          prevIntervalDays: 1,
          nextIntervalDays: correct ? 6 : 1,
          prevEaseFactor: 2.5,
          nextEaseFactor: correct ? 2.5 : 2.3,
          elapsedDays: 1,
          confidence: confidences[counter % confidences.length],
        });
      }
    }

    // Tarjetas maduras y jóvenes, para que los anillos de dominio tengan niveles.
    // `lastReviewedAt` es lo que distingue una tarjeta vista de una nueva.
    const reviewedAt = new Date(Date.now() - 86_400_000).toISOString();
    const patchedCards = cards.map((card, index) => {
      if (index % 3 === 0) {
        return {
          ...card,
          repetitions: 4,
          intervalDays: 34,
          easeFactor: 2.6,
          lapses: index % 4,
          lastReviewedAt: reviewedAt,
          dueAt: new Date(Date.now() - 86_400_000).toISOString(),
        };
      }
      if (index % 3 === 1) {
        return {
          ...card,
          repetitions: 2,
          intervalDays: 8,
          easeFactor: 2.4,
          lastReviewedAt: reviewedAt,
          dueAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        };
      }
      return card;
    });

    await new Promise((resolve, reject) => {
      const tx = db.transaction(['cards', 'reviews'], 'readwrite');
      for (const card of patchedCards) tx.objectStore('cards').put(card);
      for (const review of reviews) tx.objectStore('reviews').put(review);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

/** Espera a que React termine de aplicar el estado tras una acción. */
async function settle(page, ms = 150) {
  await page.waitForTimeout(ms);
}

/** Recorre el test de diagnóstico respondiendo siempre la primera opción. */
async function completeDiagnostic(page) {
  await page.goto(`${BASE_URL}/diagnostic`);
  await page.getByRole('button', { name: /comenzar el test/i }).click();
  await settle(page, 400);

  for (let step = 0; step < 40; step += 1) {
    const finalize = page.getByRole('button', { name: /finalizar y ver resultados/i });
    const next = page.getByRole('button', { name: 'Siguiente' });
    const option = page.locator('fieldset input:not([disabled])').first();

    if (!(await option.count())) return;
    await option.click();

    if (await finalize.count()) {
      await finalize.click();
      await settle(page, 500);
      return;
    }
    if (!(await next.count())) return;
    await next.click();
    await settle(page);
  }
}

/** Recorre una lección hasta terminarla. */
async function completeLesson(page) {
  await page.goto(`${BASE_URL}/lessons`);
  await page.locator('a[href^="/lessons/"]').first().click();
  await settle(page, 500);

  for (let step = 0; step < 30; step += 1) {
    if (await page.getByRole('button', { name: 'Repetir lección' }).count()) return;

    const finalize = page.getByRole('button', { name: 'Finalizar lección' });
    if (await finalize.count()) {
      await finalize.click();
      await settle(page, 400);
      continue;
    }

    const cont = page.getByRole('button', { name: 'Continuar' });
    if (await cont.count()) {
      await cont.click();
      await settle(page);
      continue;
    }

    const check = page.getByRole('button', { name: 'Comprobar' });
    if (await check.count()) {
      const option = page.locator('fieldset input:not([disabled])').first();
      if (await option.count()) await option.click();
      await check.click();
      await settle(page, 300);
      continue;
    }

    const reveal = page.getByRole('button', { name: 'Ver explicación' });
    if (await reveal.count()) {
      await reveal.click();
      await settle(page, 300);
      continue;
    }

    return;
  }
}

/** Repasa unas cuantas tarjetas declarando confianza alterna. */
async function reviewSomeCards(page, count = 8) {
  await page.goto(`${BASE_URL}/review`);
  await page.getByRole('button', { name: /empezar sesión/i }).click();
  await settle(page, 500);

  for (let i = 0; i < count; i += 1) {
    const sure = page.getByRole('button', { name: 'Lo tenía seguro' });
    if (!(await sure.count())) return;
    await (i % 3 === 2 ? page.getByRole('button', { name: 'Dudaba' }) : sure).click();
    await settle(page, 300);

    const grade = page.getByRole('button', { name: i % 4 === 3 ? /otra vez/i : /bien/i });
    if (!(await grade.count())) return;
    await grade.click();
    await settle(page, 300);
  }
}

async function shoot(page, name, { theme, viewport, path, fullPage = true }) {
  await page.setViewportSize(viewport);
  await page.addInitScript((value) => {
    window.localStorage.setItem('shieldup.theme', value);
  }, theme);
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage });
  console.log(`  ${OUT_DIR}/${name}.png`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 2 });
const page = await context.newPage();

page.on('console', (message) => {
  if (message.type() === 'error') console.log(`  [console] ${message.text()}`);
});
page.on('pageerror', (error) => console.log(`  [pageerror] ${error.message}`));

console.log('Sembrando datos…');
await page.goto(BASE_URL);
await page.waitForTimeout(1200);
await completeDiagnostic(page);
await completeLesson(page);
await reviewSomeCards(page);
await seedHistory(page);

console.log('Capturando…');
const only = process.env.THEME_FILTER;

if (!only || only === 'dark') {
  await shoot(page, 'dashboard-dark', { theme: 'dark', viewport: DESKTOP, path: '/' });
  await shoot(page, 'dashboard-dark-mobile', { theme: 'dark', viewport: MOBILE, path: '/' });
  await shoot(page, 'review-dark', { theme: 'dark', viewport: DESKTOP, path: '/review' });
  await shoot(page, 'review-dark-mobile', { theme: 'dark', viewport: MOBILE, path: '/review' });
  await shoot(page, 'lessons-dark', { theme: 'dark', viewport: DESKTOP, path: '/lessons' });
  await shoot(page, 'diagnostic-dark', { theme: 'dark', viewport: DESKTOP, path: '/diagnostic' });
}

// Estado de sesión: la interacción central (tarjeta + confianza + calificación).
for (const [name, viewport] of [
  ['review-session-dark', DESKTOP],
  ['review-session-dark-mobile', MOBILE],
]) {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => window.localStorage.setItem('shieldup.theme', 'dark'));
  await page.goto(`${BASE_URL}/review`);
  await page.getByRole('button', { name: /empezar sesión/i }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
  console.log(`  ${OUT_DIR}/${name}.png`);

  // Y el estado revelado, con los botones de calificación.
  await page.getByRole('button', { name: 'Lo tenía seguro' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT_DIR}/${name}-revelado.png`, fullPage: false });
  console.log(`  ${OUT_DIR}/${name}-revelado.png`);
}

// PBQ: catálogo, tablero de topología y terminal en uso.
await page.setViewportSize(DESKTOP);
await page.addInitScript(() => window.localStorage.setItem('shieldup.theme', 'dark'));

await page.goto(`${BASE_URL}/pbq`);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT_DIR}/pbq-list-dark.png`, fullPage: true });
console.log(`  ${OUT_DIR}/pbq-list-dark.png`);

await page.goto(`${BASE_URL}/pbq/pbq-segmentar-red-plana`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT_DIR}/pbq-topology-dark.png`, fullPage: true });
console.log(`  ${OUT_DIR}/pbq-topology-dark.png`);

await page.goto(`${BASE_URL}/pbq/pbq-triaje-host-comprometido`);
await page.waitForTimeout(1200);
const terminal = page.locator('[role="application"]');
await terminal.click();
await page.keyboard.type('ss -tulnp');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.type('tcpdump -n port 4444');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT_DIR}/pbq-terminal-dark.png`, fullPage: true });
console.log(`  ${OUT_DIR}/pbq-terminal-dark.png`);

if (!only || only === 'light') {
  await shoot(page, 'dashboard-light', { theme: 'light', viewport: DESKTOP, path: '/' });
  await shoot(page, 'dashboard-light-mobile', { theme: 'light', viewport: MOBILE, path: '/' });
  await shoot(page, 'review-light', { theme: 'light', viewport: DESKTOP, path: '/review' });
  await shoot(page, 'lessons-light', { theme: 'light', viewport: DESKTOP, path: '/lessons' });
}

await browser.close();
console.log('Listo.');
