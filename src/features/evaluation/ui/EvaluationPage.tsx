import { Link } from 'react-router-dom';
import { useTranslation } from '@/shared/i18n/useTranslation';
import type { TranslationKey } from '@/shared/i18n/dictionary';
import styles from './EvaluationPage.module.css';

interface EvaluationItem {
  to: string;
  titleKey: TranslationKey;
  textKey: TranslationKey;
  ctaKey: TranslationKey;
}

/**
 * Hub de evaluación.
 *
 * Agrupa diagnóstico, simulacro y PBQ bajo una sola entrada de navegación: son
 * las tres actividades con las que se "rinde cuentas", frente al estudio diario
 * (repaso) y el microlearning (lecciones). Así la barra inferior se queda en
 * cuatro secciones sin truncar etiquetas.
 */
const ITEMS: EvaluationItem[] = [
  {
    to: '/diagnostic',
    titleKey: 'evaluation.diagnostic.title',
    textKey: 'evaluation.diagnostic.text',
    ctaKey: 'evaluation.diagnostic.cta',
  },
  {
    to: '/exam',
    titleKey: 'evaluation.exam.title',
    textKey: 'evaluation.exam.text',
    ctaKey: 'evaluation.exam.cta',
  },
  {
    to: '/pbq',
    titleKey: 'evaluation.pbq.title',
    textKey: 'evaluation.pbq.text',
    ctaKey: 'evaluation.pbq.cta',
  },
];

export function EvaluationPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t('evaluation.title')}</h1>
        <p>{t('evaluation.lead')}</p>
      </header>

      <ul className={styles.list} role="list">
        {ITEMS.map((item) => (
          <li key={item.to} className={styles.item}>
            <h2 className={styles.itemTitle}>{t(item.titleKey)}</h2>
            <p className={styles.itemText}>{t(item.textKey)}</p>
            <Link className={styles.cta} to={item.to}>
              {t(item.ctaKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
