/**
 * Lógica pura del tema (sin DOM), para poder testearla.
 *
 * Se distinguen dos cosas que suelen confundirse:
 *  - **preferencia**: lo que el usuario ha elegido (`claro`, `oscuro` o `sistema`).
 *  - **tema resuelto**: el que se pinta (`claro` u `oscuro`). Si la preferencia es
 *    `sistema`, se deduce de `prefers-color-scheme`.
 *
 * La clave de almacenamiento se duplica en el script inline de index.html.
 */

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

export const THEME_STORAGE_KEY = 'shieldup.theme';

/** Color de la barra del navegador en cada tema (coincide con index.html). */
export const THEME_COLORS: Readonly<Record<ThemeMode, string>> = {
  light: '#f6f7f9',
  dark: '#0d1013',
};

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'] as const;

export const THEME_PREFERENCE_LABELS_ES: Readonly<Record<ThemePreference, string>> = {
  light: 'Claro',
  dark: 'Oscuro',
  system: 'Sistema',
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return isThemeMode(value) || value === 'system';
}

/**
 * Decide el tema a pintar: una preferencia explícita manda; `sistema` (o su
 * ausencia) sigue al sistema operativo.
 */
export function resolveTheme(preference: string | null | undefined, prefersDark: boolean): ThemeMode {
  if (isThemeMode(preference)) return preference;
  return prefersDark ? 'dark' : 'light';
}

/** La preferencia guardada, o `system` si no hay o no es válida. */
export function resolvePreference(stored: string | null | undefined): ThemePreference {
  return isThemePreference(stored) ? stored : 'system';
}

export function otherTheme(mode: ThemeMode): ThemeMode {
  return mode === 'dark' ? 'light' : 'dark';
}

/** Texto accesible del botón: describe la ACCIÓN, no el estado actual. */
export function themeToggleLabel(mode: ThemeMode): string {
  return mode === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro';
}
