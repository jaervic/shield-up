/**
 * Estado del tema (Zustand) y efectos sobre el DOM.
 *
 * Se separa `applyThemeDom` (solo pinta) de `setPreference` (pinta + persiste):
 * así el arranque y la sincronización con el sistema no sobrescriben la
 * preferencia del usuario.
 */

import { create } from 'zustand';
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  isThemeMode,
  otherTheme,
  resolvePreference,
  resolveTheme,
  type ThemeMode,
  type ThemePreference,
} from './theme';

export function prefersDarkScheme(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

export function readStoredTheme(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Pinta el tema sin persistirlo. */
export function applyThemeDom(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', THEME_COLORS[mode]);
  }
}

/** Lee el tema ya aplicado por el script inline; si no lo hay, lo resuelve. */
export function resolveInitialMode(): ThemeMode {
  const current =
    typeof document === 'undefined' ? null : document.documentElement.getAttribute('data-theme');
  if (isThemeMode(current)) return current;
  return resolveTheme(readStoredTheme(), prefersDarkScheme());
}

export interface ThemeState {
  /** Tema que se está pintando. */
  mode: ThemeMode;
  /** Lo que el usuario ha elegido. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Alterna rápido entre claro y oscuro, fijando una preferencia explícita. */
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: resolveInitialMode(),
  preference: resolvePreference(readStoredTheme()),

  setPreference(preference) {
    const mode = resolveTheme(preference, prefersDarkScheme());
    applyThemeDom(mode);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Navegación privada o almacenamiento bloqueado: el tema sigue funcionando.
    }

    set({ preference, mode });
  },

  toggle() {
    get().setPreference(otherTheme(get().mode));
  },
}));

/**
 * Inicializa el tema una vez al arrancar y, mientras la preferencia sea
 * `sistema`, sigue los cambios de `prefers-color-scheme` en caliente.
 */
export function initTheme(): void {
  const preference = resolvePreference(readStoredTheme());
  const mode = resolveInitialMode();
  applyThemeDom(mode);
  useThemeStore.setState({ preference, mode });

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (event: MediaQueryListEvent) => {
    // Solo se sigue al sistema si el usuario no ha elegido explícitamente.
    if (useThemeStore.getState().preference !== 'system') return;
    const next: ThemeMode = event.matches ? 'dark' : 'light';
    applyThemeDom(next);
    useThemeStore.setState({ mode: next });
  };

  media.addEventListener('change', handleChange);
}
