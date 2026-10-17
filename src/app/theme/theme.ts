/**
 * Lógica pura del tema (sin DOM), para poder testearla.
 * La clave de almacenamiento se duplica en el script inline de index.html.
 */

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'shieldup.theme';

/** Color de la barra del navegador en cada tema (coincide con index.html). */
export const THEME_COLORS: Readonly<Record<ThemeMode, string>> = {
  light: '#f4f7fb',
  dark: '#0b1120',
};

export const DEFAULT_THEME: ThemeMode = 'dark';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

/**
 * Decide el tema inicial: la preferencia guardada manda; si no hay, se sigue
 * la del sistema operativo.
 */
export function resolveTheme(stored: string | null | undefined, prefersDark: boolean): ThemeMode {
  if (isThemeMode(stored)) return stored;
  return prefersDark ? 'dark' : 'light';
}

export function otherTheme(mode: ThemeMode): ThemeMode {
  return mode === 'dark' ? 'light' : 'dark';
}

/** Texto accesible del botón: describe la ACCIÓN, no el estado actual. */
export function themeToggleLabel(mode: ThemeMode): string {
  return mode === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro';
}
