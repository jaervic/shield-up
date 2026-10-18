import { afterEach, describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';
import { AppShell } from '@/app/layout/AppShell';
import { Route, Routes } from 'react-router-dom';
import {
  LANGUAGES,
  TRANSLATIONS,
  type TranslationKey,
} from '@/shared/i18n/dictionary';
import { interpolate, isLanguage, resolveLanguage } from '@/shared/i18n/language';
import { useI18nStore } from '@/shared/i18n/i18nStore';
import { renderWithProviders, settle } from '../../helpers/render';

afterEach(() => {
  act(() => {
    useI18nStore.getState().setLanguage('es');
  });
});

describe('diccionario', () => {
  it('los dos idiomas cubren exactamente las mismas claves', () => {
    const spanishKeys = Object.keys(TRANSLATIONS.es).sort();
    const englishKeys = Object.keys(TRANSLATIONS.en).sort();

    expect(englishKeys).toEqual(spanishKeys);
    expect(spanishKeys.length).toBeGreaterThan(40);
  });

  it('ninguna traducción está vacía', () => {
    for (const language of LANGUAGES) {
      for (const [key, value] of Object.entries(TRANSLATIONS[language])) {
        expect(value.trim().length, `${language}:${key} está vacía`).toBeGreaterThan(0);
      }
    }
  });

  it('los huecos de una plantilla coinciden entre idiomas', () => {
    const holes = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

    for (const key of Object.keys(TRANSLATIONS.es) as TranslationKey[]) {
      expect(holes(TRANSLATIONS.en[key]), `los huecos de "${key}" no coinciden`).toEqual(
        holes(TRANSLATIONS.es[key]),
      );
    }
  });

  it('las claves usadas existen en ambos idiomas', () => {
    expect(TRANSLATIONS.es['nav.dashboard']).toBe('Panel');
    expect(TRANSLATIONS.en['nav.dashboard']).toBe('Dashboard');
  });
});

describe('interpolate', () => {
  it('sustituye los huecos', () => {
    expect(interpolate('{count} tarjetas', { count: 58 })).toBe('58 tarjetas');
    expect(interpolate('Algo se ha roto en {scope}', { scope: 'esta sección' })).toBe(
      'Algo se ha roto en esta sección',
    );
  });

  it('sustituye varias apariciones del mismo hueco', () => {
    expect(interpolate('{x} y {x}', { x: 'uno' })).toBe('uno y uno');
  });

  it('deja el hueco si falta el valor, para que se note', () => {
    expect(interpolate('{count} tarjetas', {})).toBe('{count} tarjetas');
    expect(interpolate('{count} tarjetas')).toBe('{count} tarjetas');
  });

  it('sin huecos devuelve el texto tal cual', () => {
    expect(interpolate('Ajustes')).toBe('Ajustes');
  });
});

describe('resolveLanguage / isLanguage', () => {
  it('solo acepta los idiomas soportados', () => {
    expect(isLanguage('es')).toBe(true);
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });

  it('la preferencia guardada manda', () => {
    expect(resolveLanguage('en', 'es-ES')).toBe('en');
    expect(resolveLanguage('es', 'en-US')).toBe('es');
  });

  it('sin preferencia sigue al navegador', () => {
    expect(resolveLanguage(null, 'en-GB')).toBe('en');
    expect(resolveLanguage(null, 'en')).toBe('en');
  });

  it('cualquier otro idioma recibe español, que es el del contenido', () => {
    expect(resolveLanguage(null, 'fr-FR')).toBe('es');
    expect(resolveLanguage(null, 'de')).toBe('es');
    expect(resolveLanguage(null, null)).toBe('es');
    expect(resolveLanguage('portugues', 'fr')).toBe('es');
  });
});

describe('cambio de idioma en la interfaz', () => {
  function renderShell() {
    return renderWithProviders(
      <Routes>
        <Route path="/" element={<AppShell />} />
      </Routes>,
    );
  }

  it('traduce la navegación y el pie', async () => {
    renderShell();
    await settle();

    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Panel' })).toBeInTheDocument();

    act(() => {
      useI18nStore.getState().setLanguage('en');
    });

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Panel' })).not.toBeInTheDocument();
  });

  it('actualiza el atributo lang del documento', async () => {
    renderShell();
    await settle();

    act(() => {
      useI18nStore.getState().setLanguage('en');
    });
    expect(document.documentElement.getAttribute('lang')).toBe('en');

    act(() => {
      useI18nStore.getState().setLanguage('es');
    });
    expect(document.documentElement.getAttribute('lang')).toBe('es');
  });

  it('traduce el aviso de no afiliación', async () => {
    renderShell();
    await settle();

    expect(screen.getByText('No oficial')).toBeInTheDocument();

    act(() => {
      useI18nStore.getState().setLanguage('en');
    });

    expect(screen.getByText('Unofficial')).toBeInTheDocument();
  });

  it('el idioma elegido se refleja en el store', async () => {
    renderWithProviders(<AppShell />);
    await settle();

    act(() => {
      useI18nStore.getState().setLanguage('en');
    });

    expect(useI18nStore.getState().language).toBe('en');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });
});
