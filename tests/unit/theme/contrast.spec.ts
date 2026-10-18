import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Test de contraste WCAG.
 *
 * Lee `src/styles/tokens.css` (fuente única de verdad), resuelve las
 * referencias `var(--x)`, y comprueba la ratio de cada par semántico. Si un
 * retoque de color rompe la accesibilidad, rompe el build: la accesibilidad
 * deja de depender de una revisión manual.
 *
 * Se resuelve la ruta con `process.cwd()` porque bajo jsdom `import.meta.url`
 * no es una URL `file:`.
 */

const TOKENS_PATH = resolve(process.cwd(), 'src/styles/tokens.css');

type TokenMap = Record<string, string>;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Extrae el contenido de un bloque `selector { ... }` contando llaves. */
function extractBlock(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) {
    throw new Error(`No se encontró el bloque "${selector}" en tokens.css`);
  }
  const open = css.indexOf('{', start);
  let depth = 0;

  for (let i = open; i < css.length; i += 1) {
    const char = css[i];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }

  throw new Error(`El bloque "${selector}" no cierra correctamente.`);
}

function parseDeclarations(block: string): TokenMap {
  const result: TokenMap = {};
  const regex = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;

  let match = regex.exec(block);
  while (match) {
    const [, name, value] = match;
    if (name && value) result[name] = value.trim();
    match = regex.exec(block);
  }

  return result;
}

/** Resuelve `var(--x)` de forma recursiva (los tokens pueden referenciarse). */
function resolveToken(tokens: TokenMap, name: string, depth = 0): string {
  const raw = tokens[name];
  if (raw === undefined) {
    throw new Error(`Token no definido: --${name}`);
  }
  const reference = /^var\(--([a-z0-9-]+)\)$/.exec(raw);
  if (!reference) return raw;

  if (depth > 5) throw new Error(`Referencia circular al resolver --${name}`);
  return resolveToken(tokens, reference[1] as string, depth + 1);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`Se esperaba un color hex de 6 dígitos, llegó "${hex}"`);
  }
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function channelLuminance(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- Carga de los temas -----------------------------------------------------

const rawCss = stripComments(readFileSync(TOKENS_PATH, 'utf8'));
const baseTokens = parseDeclarations(extractBlock(rawCss, ':root {'));
const lightOverrides = parseDeclarations(extractBlock(rawCss, ":root[data-theme='light']"));

const THEMES: Record<string, TokenMap> = {
  oscuro: baseTokens,
  claro: { ...baseTokens, ...lightOverrides },
};

/** Pares texto/fondo: exigen 4.5:1 (WCAG AA). */
const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['color-text', 'color-bg'],
  ['color-text', 'color-surface'],
  ['color-text', 'color-surface-2'],
  ['color-text', 'color-bg-accent'],
  ['color-text-muted', 'color-bg'],
  ['color-text-muted', 'color-surface'],
  ['color-text-muted', 'color-surface-2'],
  ['color-text-muted', 'color-bg-accent'],
  ['color-primary-text', 'color-bg'],
  ['color-primary-text', 'color-surface'],
  ['color-primary-text', 'color-bg-accent'],
  ['color-on-primary', 'color-primary'],
  ['color-primary-strong-text', 'color-primary-strong'],
  ['color-on-accent', 'color-accent'],
  ['color-accent', 'color-bg'],
  ['color-accent', 'color-surface'],
  ['color-success', 'color-bg'],
  ['color-success', 'color-surface'],
  ['color-warning', 'color-bg'],
  ['color-warning', 'color-surface'],
  ['color-danger', 'color-bg'],
  ['color-danger', 'color-surface'],
];

/**
 * Elementos no textuales (bordes, barras): exigen 3:1 (WCAG 1.4.11).
 *
 * `--color-border` (el borde por defecto) queda fuera a propósito: los
 * componentes que lo usan se identifican por su relleno de fondo, no por el
 * borde. Solo se exige contraste a los bordes que SON la frontera del control
 * (`--color-border-strong`) y a los indicadores de estado (`--color-primary`).
 */
const NON_TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['color-border-strong', 'color-surface'],
  ['color-border-strong', 'color-surface-2'],
  ['color-primary', 'color-bg'],
  ['color-primary', 'color-surface'],
  ['color-primary', 'color-surface-2'],
];

describe('tokens de color', () => {
  it('define los dos temas con las mismas claves de color', () => {
    const lightKeys = Object.keys(lightOverrides);
    const baseKeys = Object.keys(baseTokens).filter((key) => key.startsWith('color-'));

    // El tema claro solo sobrescribe; ninguna clave debe quedar sin definir.
    for (const key of baseKeys) {
      expect(
        baseTokens[key] ?? lightKeys.includes(key),
        `La clave --${key} no existe en el tema claro ni en la base`,
      ).toBeTruthy();
    }
    expect(lightKeys.length).toBeGreaterThan(10);
  });

  it('no usa colores literales en los tokens de color (hex, rgba o var)', () => {
    for (const [name, value] of Object.entries(baseTokens)) {
      if (!name.startsWith('color-') && !name.startsWith('domain-')) continue;
      expect(value, `--${name} = "${value}"`).toMatch(
        /^(#[0-9a-fA-F]{6}|rgba?\([^)]+\)|var\(--[a-z0-9-]+\))$/,
      );
    }
  });
});

describe.each(Object.entries(THEMES))('contraste WCAG en tema %s', (themeName, tokens) => {
  it.each(TEXT_PAIRS)('%s sobre %s alcanza 4.5:1', (foreground, background) => {
    const ratio = contrastRatio(
      resolveToken(tokens, foreground),
      resolveToken(tokens, background),
    );

    expect(
      Number(ratio.toFixed(2)),
      `--${foreground} sobre --${background} en tema ${themeName}`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT_PAIRS)('%s sobre %s alcanza 3:1', (foreground, background) => {
    const ratio = contrastRatio(
      resolveToken(tokens, foreground),
      resolveToken(tokens, background),
    );

    expect(
      Number(ratio.toFixed(2)),
      `--${foreground} sobre --${background} en tema ${themeName}`,
    ).toBeGreaterThanOrEqual(3);
  });

  it('los cinco colores de dominio son distinguibles entre sí', () => {
    const domains = ['domain-1', 'domain-2', 'domain-3', 'domain-4', 'domain-5'] as const;

    for (const domain of domains) {
      const value = resolveToken(tokens, domain);
      expect(value, `--${domain}`).toMatch(/^#[0-9a-fA-F]{6}$/);
    }

    // Ningún par debe ser idéntico: el color no es el único canal, pero ayuda.
    const values = domains.map((domain) => resolveToken(tokens, domain));
    expect(new Set(values).size).toBe(domains.length);
  });
});
