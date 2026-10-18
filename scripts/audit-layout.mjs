/**
 * Auditoría de layout en navegador real.
 *
 * Uso: BASE_URL=http://localhost:5173 node scripts/audit-layout.mjs
 *
 * Comprueba hechos medibles, no impresiones: desbordamiento horizontal,
 * objetivos táctiles por debajo de 44 px, elementos que se salen del viewport y
 * el tamaño real de los gráficos.
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'móvil-360', width: 360, height: 780 },
  { name: 'móvil-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'escritorio-1440', width: 1440, height: 900 },
];

const ROUTES = ['/', '/review', '/lessons', '/diagnostic', '/pbq', '/pbq/pbq-segmentar-red-plana'];

const MIN_TAP = 44;

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const problems = [];

for (const viewport of VIEWPORTS) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  for (const route of ROUTES) {
    await page.goto(`${BASE_URL}${route}`);
    await page.waitForTimeout(700);

    const report = await page.evaluate((minTap) => {
      const doc = document.documentElement;
      const result = {
        overflow: doc.scrollWidth - doc.clientWidth,
        overflowing: [],
        smallTargets: [],
        hiddenText: [],
      };

      // Elementos que sobresalen del viewport.
      for (const element of document.body.querySelectorAll('*')) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right > doc.clientWidth + 1 || rect.left < -1) {
          const label = `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 40)}`;
          if (!result.overflowing.includes(label)) result.overflowing.push(label);
        }
      }

      // Objetivos táctiles interactivos.
      const interactive = document.body.querySelectorAll('button, a, input, select, [role="button"]');
      for (const element of interactive) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.height < minTap || rect.width < 24) {
          const text = (element.textContent ?? '').trim().slice(0, 30);
          result.smallTargets.push(
            `${element.tagName.toLowerCase()}[${text}] ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          );
        }
      }

      return result;
    }, MIN_TAP);

    const where = `${viewport.name} ${route}`;

    if (report.overflow > 1) {
      problems.push(`${where}: desbordamiento horizontal de ${report.overflow}px`);
    }
    if (report.overflowing.length > 0) {
      problems.push(`${where}: fuera del viewport -> ${report.overflowing.slice(0, 4).join(' | ')}`);
    }
    if (report.smallTargets.length > 0) {
      problems.push(
        `${where}: ${report.smallTargets.length} objetivos < ${MIN_TAP}px -> ${report.smallTargets.slice(0, 5).join(' | ')}`,
      );
    }

    console.log(`${where.padEnd(28)} overflow=${report.overflow}px  táctiles pequeños=${report.smallTargets.length}`);
  }
}

// Hechos concretos de los gráficos, en escritorio.
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE_URL}/`);
await page.waitForTimeout(900);

const facts = await page.evaluate(() => {
  const pick = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      background: style.backgroundColor,
      stroke: style.stroke,
      color: style.color,
    };
  };

  // Los anillos de dominio: `svg.ring` (los iconos de la nav también tienen círculos).
  const ringCircles = [...document.querySelectorAll('svg[class*="ring"] circle')].map((circle) => ({
    stroke: getComputedStyle(circle).stroke,
    strokeWidth: getComputedStyle(circle).strokeWidth,
  }));

  return {
    heatCell: pick('[role="img"] > span'),
    heatGrid: pick('[role="img"]'),
    ringTrack: ringCircles[0] ?? null,
    ringArc: ringCircles[1] ?? null,
    ringCount: ringCircles.length,
    loadTrack: pick('[role="region"] li > span:nth-child(2)'),
    loadBarCount: document.querySelectorAll('[role="region"] li').length,
  };
});

console.log('\nHechos medidos (escritorio):');
console.log(JSON.stringify(facts, null, 2));

console.log('\n=== PROBLEMAS ===');
console.log(problems.length === 0 ? '(ninguno)' : problems.join('\n'));

await browser.close();
