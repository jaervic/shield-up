import { beforeEach, describe, expect, it } from 'vitest';
import {
  THEME_COLORS,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  isThemeMode,
  isThemePreference,
  otherTheme,
  resolvePreference,
  resolveTheme,
  themeToggleLabel,
} from '@/app/theme/theme';
import { applyThemeDom, readStoredTheme, useThemeStore } from '@/app/theme/themeStore';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('isThemeMode', () => {
  it('solo acepta los dos temas válidos', () => {
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('system')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
  });
});

describe('resolveTheme', () => {
  it('la preferencia guardada manda sobre el sistema', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('sin preferencia sigue al sistema', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });

  it('ignora valores almacenados inválidos', () => {
    expect(resolveTheme('purple', true)).toBe('dark');
    expect(resolveTheme('', false)).toBe('light');
  });

  it('"sistema" sigue al sistema operativo', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('isThemePreference / resolvePreference', () => {
  it('acepta las tres preferencias', () => {
    for (const preference of THEME_PREFERENCES) {
      expect(isThemePreference(preference)).toBe(true);
    }
    expect(isThemePreference('auto')).toBe(false);
  });

  it('sin preferencia guardada, la opción por defecto es seguir al sistema', () => {
    expect(resolvePreference(null)).toBe('system');
    expect(resolvePreference('')).toBe('system');
    expect(resolvePreference('purple')).toBe('system');
  });

  it('respeta las preferencias explícitas', () => {
    expect(resolvePreference('light')).toBe('light');
    expect(resolvePreference('dark')).toBe('dark');
    expect(resolvePreference('system')).toBe('system');
  });
});

describe('preferencia del tema en el store', () => {
  it('elegir "sistema" guarda la preferencia y resuelve el tema', () => {
    useThemeStore.getState().setPreference('system');

    expect(useThemeStore.getState().preference).toBe('system');
    expect(readStoredTheme()).toBe('system');
    expect(['light', 'dark']).toContain(useThemeStore.getState().mode);
  });

  it('elegir un tema explícito lo fija y lo persiste', () => {
    useThemeStore.getState().setPreference('light');

    expect(useThemeStore.getState().mode).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(readStoredTheme()).toBe('light');
  });

  it('el botón de la cabecera fija una preferencia explícita', () => {
    useThemeStore.getState().setPreference('dark');
    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().preference).toBe('light');
  });
});

describe('otherTheme', () => {
  it('alterna entre claro y oscuro', () => {
    expect(otherTheme('dark')).toBe('light');
    expect(otherTheme('light')).toBe('dark');
  });
});

describe('themeToggleLabel', () => {
  it('describe la acción, no el estado actual', () => {
    expect(themeToggleLabel('dark')).toMatch(/claro/i);
    expect(themeToggleLabel('light')).toMatch(/oscuro/i);
  });
});

describe('applyThemeDom', () => {
  it('fija el atributo data-theme y el color de la barra del navegador', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);

    try {
      applyThemeDom('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(meta.getAttribute('content')).toBe(THEME_COLORS.light);

      applyThemeDom('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(meta.getAttribute('content')).toBe(THEME_COLORS.dark);
    } finally {
      meta.remove();
    }
  });
});

describe('readStoredTheme', () => {
  it('devuelve la preferencia guardada', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('devuelve null si no hay nada guardado', () => {
    expect(readStoredTheme()).toBeNull();
  });
});
