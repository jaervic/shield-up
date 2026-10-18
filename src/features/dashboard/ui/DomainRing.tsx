import type { DomainId } from '@/domain/domain';
import styles from './DomainRing.module.css';

export interface DomainRingProps {
  domain: DomainId;
  /** 0..1 */
  mastery: number;
  size?: number;
}

const STROKE = 5;

/**
 * Anillo de dominio.
 *
 * Ver el dominio "llenarse" motiva más que leer un porcentaje. Es decorativo
 * (`aria-hidden`): el dato accesible va en el texto de la fila, para no
 * duplicar el anuncio en lectores de pantalla.
 */
export function DomainRing({ domain, mastery, size = 56 }: DomainRingProps) {
  const radius = (size - STROKE) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, mastery));
  const arc = circumference * clamped;

  return (
    <svg
      className={styles.ring}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle className={styles.track} cx={center} cy={center} r={radius} strokeWidth={STROKE} />
      <circle
        className={styles.arc}
        cx={center}
        cy={center}
        r={radius}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${arc} ${circumference}`}
        style={{ stroke: `var(--domain-${domain})` }}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
}
