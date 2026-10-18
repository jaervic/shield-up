/**
 * Resolución del idioma (sin DOM, para poder testearlo).
 */

import { LANGUAGES, type Language } from './dictionary';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.includes(value as Language);
}

/**
 * Decide el idioma inicial: la preferencia guardada manda; si no la hay, se
 * mira el idioma del navegador y se cae al español.
 *
 * Solo se contemplan los dos idiomas de la interfaz: cualquier otro navegador
 * recibe español, que es el idioma del contenido.
 */
export function resolveLanguage(
  stored: string | null | undefined,
  navigatorLanguage: string | null | undefined,
): Language {
  if (isLanguage(stored)) return stored;

  const preferred = (navigatorLanguage ?? '').toLowerCase();
  return preferred.startsWith('en') ? 'en' : 'es';
}

/**
 * Sustituye los huecos `{nombre}` de una plantilla.
 * Si falta un valor, se deja el hueco tal cual: es más fácil de detectar que un
 * `undefined` suelto en medio de una frase.
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (params === undefined) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
