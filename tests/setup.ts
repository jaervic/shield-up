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

beforeEach(() => {
  enableActEnvironment();
});

afterEach(() => {
  cleanup();
  enableActEnvironment();
});
