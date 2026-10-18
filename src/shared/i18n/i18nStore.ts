/**
 * Estado del idioma (Zustand).
 *
 * Es una preferencia de interfaz, así que vive en `localStorage` y no en
 * IndexedDB: tiene que poder leerse antes del primer pintado, igual que el tema.
 */

import { create } from 'zustand';
import { LANGUAGE_STORAGE_KEY, type Language } from './dictionary';
import { resolveLanguage } from './language';

function readStored(): string | null {
  try {
    return typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function navigatorLanguage(): string | null {
  return typeof navigator === 'undefined' ? null : navigator.language;
}

/** Mantiene `<html lang>` sincronizado: afecta a lectores de pantalla y al guionado. */
function applyLanguageDom(language: Language): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', language);
  }
}

export function resolveInitialLanguage(): Language {
  return resolveLanguage(readStored(), navigatorLanguage());
}

export interface I18nState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  language: resolveInitialLanguage(),

  setLanguage(language) {
    applyLanguageDom(language);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Almacenamiento bloqueado: el idioma sigue funcionando en esta sesión.
    }
    set({ language });
  },
}));

/** Sincroniza el atributo `lang` con el idioma ya resuelto al arrancar. */
export function initLanguage(): void {
  applyLanguageDom(useI18nStore.getState().language);
}
