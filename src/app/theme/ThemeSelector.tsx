import { THEME_PREFERENCES } from './theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/dictionary';
import { useThemeStore } from './themeStore';
import styles from './ThemeSelector.module.css';

const PREFERENCE_LABELS: Readonly<Record<string, TranslationKey>> = {
  light: 'theme.light',
  dark: 'theme.dark',
  system: 'theme.system',
};

/**
 * Selector de tema con las tres opciones.
 *
 * El botón de la cabecera sigue ahí para el cambio rápido; aquí está la opción
 * completa, incluida la de volver a seguir al sistema.
 */
export function ThemeSelector() {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const { t } = useTranslation();

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{t('theme.legend')}</legend>

      <div className={styles.options}>
        {THEME_PREFERENCES.map((option) => {
          const labelKey = PREFERENCE_LABELS[option] ?? 'theme.system';

          return (
            <label
              key={option}
              className={preference === option ? styles.optionActive : styles.option}
            >
              <input
                className={styles.input}
                type="radio"
                name="theme-preference"
                value={option}
                checked={preference === option}
                onChange={() => setPreference(option)}
              />
              <span>{t(labelKey)}</span>
            </label>
          );
        })}
      </div>

      <p className={styles.hint}>{t('theme.systemHint')}</p>
    </fieldset>
  );
}
