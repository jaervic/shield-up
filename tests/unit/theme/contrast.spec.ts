import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
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

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(value: string): Rgba {
  const hex = /^#([0-9a-fA-F]{6})$/.exec(value);
  if (hex?.[1]) {
    const [r, g, b] = hexToRgb(value);
    return { r, g, b, a: 1 };
  }

  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(value);
  if (!rgba) {
    throw new Error(`Color no reconocido: "${value}"`);
  }

  return {
    r: Number(rgba[1]),
    g: Number(rgba[2]),
    b: Number(rgba[3]),
    a: rgba[4] === undefined ? 1 : Number(rgba[4]),
  };
}

/**
 * Compone un color translúcido sobre un fondo opaco.
 *
 * Necesario porque los tokens `*-soft` son `rgba(...)`: el contraste real del
 * texto que va encima depende del fondo sobre el que se componen, no del valor
 * del token por sí solo.
 */
function composite(over: string, under: string): string {
  const top = parseColor(over);
  const bottom = parseColor(under);
  const mix = (t: number, u: number) => Math.round(t * top.a + u * (1 - top.a));
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');

  return `#${toHex(mix(top.r, bottom.r))}${toHex(mix(top.g, bottom.g))}${toHex(
    mix(top.b, bottom.b),
  )}`;
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

/** Recorre `src/` y devuelve todos los tokens referenciados con `var()`. */
function collectUsedTokens(root: string): Set<string> {
  const used = new Set<string>();

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      // El propio archivo de tokens define, no usa.
      if (full.endsWith('tokens.css')) continue;

      const content = readFileSync(full, 'utf8');
      for (const match of content.matchAll(/var\(--([a-z0-9-]+)\)/g)) {
        if (match[1]) used.add(match[1]);
      }
    }
  };

  walk(root);
  return used;
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
const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [  ['color-text', 'color-bg'],
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

/** Los colores de dominio también se usan como TEXTO (etiqueta de dominio, por
 * ejemplo en los resultados del examen): deben leerse sobre la superficie. */
const DOMAIN_SURFACES = ['color-surface', 'color-bg', 'color-surface-2'] as const;

const DOMAIN_TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [1, 2, 3, 4, 5].flatMap(
  (domain) => DOMAIN_SURFACES.map((surface) => [`domain-${domain}`, surface] as const),
);

/** Elementos no textuales (bordes, barras): exigen 3:1 (WCAG 1.4.11).
 *
 * Quedan fuera a propósito:
 *  - `--color-border`: los componentes que lo usan se identifican por su
 *    relleno de fondo, no por el borde.
 *  - `--color-track`: es la referencia VACÍA de barras y anillos, no la
 *    frontera de un control. Se queda en ~2:1 para verse sin competir con el
 *    relleno, que es el dato.
 */
const NON_TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['color-border-strong', 'color-surface'],
  ['color-border-strong', 'color-surface-2'],
  ['color-primary', 'color-bg'],
  ['color-primary', 'color-surface'],
  ['color-primary', 'color-surface-2'],
];

/** Texto sobre un relleno sólido de acento (estados hover de los botones). */
const FILL_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['color-surface', 'color-success'],
  ['color-surface', 'color-warning'],
  ['color-surface', 'color-danger'],
];

interface SoftPair {
  fg: string;
  soft: string;
  base: string;
}

/**
 * Texto sobre un fondo translúcido (`*-soft`) compuesto sobre su base.
 *
 * Es el caso de las opciones marcadas y de las insignias de estado. Sin
 * componer el color, el contraste real queda sin comprobar: el token por sí
 * solo no dice nada, porque es `rgba`.
 */
const SOFT_PAIRS: readonly SoftPair[] = [
  { fg: 'color-text', soft: 'color-primary-soft', base: 'color-surface-2' },
  { fg: 'color-text', soft: 'color-success-soft', base: 'color-surface-2' },
  { fg: 'color-text', soft: 'color-warning-soft', base: 'color-surface-2' },
  { fg: 'color-success', soft: 'color-success-soft', base: 'color-surface' },
  { fg: 'color-warning', soft: 'color-warning-soft', base: 'color-surface' },
];

describe('aritmética del test', () => {
  // Sin esto, un error en el cálculo haría pasar el test por la razón equivocada.
  it('la ratio sigue la fórmula WCAG en casos conocidos', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 2);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // El gris clásico del límite AA sobre blanco.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('es simétrica respecto al orden de los colores', () => {
    expect(contrastRatio('#0d1013', '#f6f7f9')).toBeCloseTo(
      contrastRatio('#f6f7f9', '#0d1013'),
      10,
    );
  });

  it('compone un color translúcido sobre un fondo opaco', () => {
    expect(composite('rgba(0, 0, 0, 0.5)', '#ffffff')).toBe('#808080');
    expect(composite('rgba(255, 255, 255, 1)', '#000000')).toBe('#ffffff');
    // Alfa 0 no altera el fondo.
    expect(composite('rgba(255, 0, 0, 0)', '#123456')).toBe('#123456');
  });

  it('rechaza valores de color que no sabe interpretar', () => {
    expect(() => parseColor('rebeccapurple')).toThrow(/no reconocido/i);
    expect(() => hexToRgb('#fff')).toThrow(/6 dígitos/i);
  });
});

describe('tokens de color', () => {  it('define los dos temas con las mismas claves de color', () => {
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

  it('no deja tokens de color definidos y sin usar', () => {
    const used = collectUsedTokens(resolve(process.cwd(), 'src'));

    // Los colores de dominio se referencian con plantilla: `var(--domain-${id})`.
    const DYNAMIC = ['domain-1', 'domain-2', 'domain-3', 'domain-4', 'domain-5'];

    const unused = Object.keys(baseTokens).filter(
      (name) => name.startsWith('color-') && !used.has(name) && !DYNAMIC.includes(name),
    );

    expect(unused, `Tokens definidos y nunca usados: ${unused.join(', ')}`).toEqual([]);
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

  it.each(DOMAIN_TEXT_PAIRS)('el texto %s sobre %s alcanza 4.5:1', (foreground, background) => {
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

  it.each(FILL_PAIRS)('el texto %s sobre el relleno %s alcanza 4.5:1', (foreground, fill) => {
    const ratio = contrastRatio(resolveToken(tokens, foreground), resolveToken(tokens, fill));

    expect(
      Number(ratio.toFixed(2)),
      `--${foreground} sobre --${fill} en tema ${themeName}`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SOFT_PAIRS)(
    '$fg sobre $soft compuesto en $base alcanza 4.5:1',
    ({ fg, soft, base }) => {
      const background = composite(resolveToken(tokens, soft), resolveToken(tokens, base));
      const ratio = contrastRatio(resolveToken(tokens, fg), background);

      expect(
        Number(ratio.toFixed(2)),
        `--${fg} sobre --${soft} (compuesto en --${base}) en tema ${themeName}`,
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

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
