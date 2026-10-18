import styles from './UnofficialBadge.module.css';

const DISCLAIMER =
  'Material de estudio independiente. No está afiliado ni respaldado por CompTIA.';

/**
 * Aviso de no afiliación.
 *
 * Visible en la cabecera, no solo en el pie: deja claro desde el primer segundo
 * que ShieldUp es material de estudio independiente.
 */
export function UnofficialBadge() {
  return (
    <span className={styles.badge} title={DISCLAIMER}>
      No oficial
    </span>
  );
}
