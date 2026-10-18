import { THEME_PREFERENCES, THEME_PREFERENCE_LABELS_ES } from './theme';
import { useThemeStore } from './themeStore';
import styles from './ThemeSelector.module.css';

/**
 * Selector de tema con las tres opciones.
 *
 * El botón de la cabecera sigue ahí para el cambio rápido; aquí está la opción
 * completa, incluida la de volver a seguir al sistema.
 */
export function ThemeSelector() {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Tema</legend>

      <div className={styles.options}>
        {THEME_PREFERENCES.map((option) => (
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
            <span>{THEME_PREFERENCE_LABELS_ES[option]}</span>
          </label>
        ))}
      </div>

      <p className={styles.hint}>
        Con «Sistema», la aplicación sigue el tema del dispositivo y cambia con él.
      </p>
    </fieldset>
  );
}
