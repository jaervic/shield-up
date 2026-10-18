import { LANGUAGES, LANGUAGE_LABELS } from './dictionary';
import { useTranslation } from './useTranslation';
import styles from './LanguageSwitch.module.css';

/**
 * Selector de idioma de la interfaz.
 *
 * El contenido de estudio está redactado en español, y la ayuda lo dice: cambiar
 * a inglés traduce los mandos, no las preguntas.
 */
export function LanguageSwitch() {
  const { t, language, setLanguage } = useTranslation();

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{t('language.legend')}</legend>

      <div className={styles.options}>
        {LANGUAGES.map((option) => (
          <label
            key={option}
            className={language === option ? styles.optionActive : styles.option}
            lang={option}
          >
            <input
              className={styles.input}
              type="radio"
              name="language"
              value={option}
              checked={language === option}
              onChange={() => setLanguage(option)}
            />
            <span>{LANGUAGE_LABELS[option]}</span>
          </label>
        ))}
      </div>

      <p className={styles.hint}>{t('language.hint')}</p>
    </fieldset>
  );
}
