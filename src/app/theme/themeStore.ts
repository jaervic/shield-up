/**
 * Estado del tema (Zustand) y efectos sobre el DOM.
 *
 * Se separa `applyThemeDom` (solo pinta) de `setMode` (pinta + persiste): así el
 * arranque y la sincronización con el sistema no sobrescriben la preferencia
 * del usuario.
 */

import { create } from 'zustand';
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  isThemeMode,
  otherTheme,
  resolveTheme,
  type ThemeMode,
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
export function resolveInitialTheme(): ThemeMode {
  const current =
    typeof document === 'undefined' ? null : document.documentElement.getAttribute('data-theme');
  if (isThemeMode(current)) return current;
  return resolveTheme(readStoredTheme(), prefersDarkScheme());
}

export interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: resolveInitialTheme(),

  setMode(mode) {
    applyThemeDom(mode);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Navegación privada o almacenamiento bloqueado: el tema sigue funcionando.
    }
    set({ mode });
  },

  toggle() {
    get().setMode(otherTheme(get().mode));
  },
}));

/**
 * Inicializa el tema una vez al arrancar y, mientras el usuario no haya elegido
 * explícitamente, sigue los cambios de preferencia del sistema.
 */
export function initTheme(): void {
  const mode = resolveInitialTheme();
  applyThemeDom(mode);
  useThemeStore.setState({ mode });

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (event: MediaQueryListEvent) => {
    if (readStoredTheme()) return; // el usuario ya eligió: no se toca
    const next: ThemeMode = event.matches ? 'dark' : 'light';
    applyThemeDom(next);
    useThemeStore.setState({ mode: next });
  };

  media.addEventListener('change', handleChange);
}
