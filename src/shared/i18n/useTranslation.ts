import { useCallback } from 'react';
import { TRANSLATIONS, type Language, type TranslationKey } from './dictionary';
import { interpolate } from './language';
import { useI18nStore } from './i18nStore';

export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export interface UseTranslationResult {
  t: Translate;
  language: Language;
  setLanguage: (language: Language) => void;
}

/**
 * Traducción de la interfaz.
 *
 * Sin dependencias: un diccionario tipado y una función. El tipo de las claves
 * se deriva del español, así que usar una clave que no existe no compila, y el
 * inglés está obligado a cubrir todas.
 */
export function useTranslation(): UseTranslationResult {
  const language = useI18nStore((state) => state.language);
  const setLanguage = useI18nStore((state) => state.setLanguage);

  const t = useCallback<Translate>(
    (key, params) => interpolate(TRANSLATIONS[language][key], params),
    [language],
  );

  return { t, language, setLanguage };
}
