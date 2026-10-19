import { clsx } from 'clsx';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** Ancho CSS: porcentaje, `rem`, `ch`… */
  width?: string;
  height?: string;
  className?: string;
}

/**
 * Bloque de carga genérico.
 *
 * Es decorativo (`aria-hidden`): quien anuncia el estado es `LoadingSkeleton`,
 * con un texto para lectores de pantalla. El brillo se desactiva con
 * `prefers-reduced-motion`, igual que el resto de transiciones.
 */
export function Skeleton({ width = '100%', height = '1rem', className }: SkeletonProps) {
  return (
    <span
      className={clsx(styles.skeleton, className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export interface LoadingSkeletonProps {
  /** Texto para lectores de pantalla ("Cargando métricas…"). */
  label: string;
  lines?: number;
  className?: string;
}

/**
 * Estado de carga accesible: el hueco visual es un skeleton, pero el anuncio
 * sigue siendo texto, así que una persona con lector de pantalla no pierde la
 * información de que la sección está cargando.
 */
export function LoadingSkeleton({ label, lines = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={clsx(styles.stack, className)} role="status">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? '55%' : '100%'} />
      ))}
    </div>
  );
}
