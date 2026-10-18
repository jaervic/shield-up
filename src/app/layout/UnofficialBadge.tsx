import { useTranslation } from '@/shared/i18n/useTranslation';
import styles from './UnofficialBadge.module.css';

/**
 * Aviso de no afiliación.
 *
 * Visible en la cabecera, no solo en el pie: deja claro desde el primer segundo
 * que ShieldUp es material de estudio independiente.
 */
export function UnofficialBadge() {
  const { t } = useTranslation();

  return (
    <span className={styles.badge} title={t('brand.unofficialTitle')}>
      {t('brand.unofficial')}
    </span>
  );
}
