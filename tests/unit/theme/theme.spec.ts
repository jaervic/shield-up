import { beforeEach, describe, expect, it } from 'vitest';
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  isThemeMode,
  otherTheme,
  resolveTheme,
  themeToggleLabel,
} from '@/app/theme/theme';
import { applyThemeDom, readStoredTheme } from '@/app/theme/themeStore';

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
