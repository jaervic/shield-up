import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

type ActEnvironment = { IS_REACT_ACT_ENVIRONMENT: boolean };

/**
 * React 19 exige este flag para reconocer el entorno de test en `act()`.
 * RTL lo desactiva en su `cleanup()`, así que se restaura antes de cada test.
 */
function enableActEnvironment(): void {
  (globalThis as unknown as ActEnvironment).IS_REACT_ACT_ENVIRONMENT = true;
}

/**
 * Idioma fijo para los tests.
 *
 * `navigator.language` en jsdom es `en-US`, así que sin esto la interfaz se
 * resolvería en inglés y las aserciones en español fallarían. Se fija antes de
 * que los ficheros de test importen el store, que lee la preferencia al cargarse.
 */
function fixLanguageForTests(): void {
  try {
    window.localStorage.setItem('shieldup.language', 'es');
  } catch {
    // Sin almacenamiento, el idioma cae al de por defecto del navegador.
  }
}

fixLanguageForTests();

beforeEach(() => {
  enableActEnvironment();
  fixLanguageForTests();
});

afterEach(() => {
  cleanup();
  enableActEnvironment();
  fixLanguageForTests();
});
