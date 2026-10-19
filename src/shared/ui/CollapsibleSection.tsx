import { useEffect, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import styles from './CollapsibleSection.module.css';

/** Ancho a partir del cual los bloques de apoyo arrancan abiertos. */
const DESKTOP_QUERY = '(min-width: 48rem)';

/**
 * ¿Debe arrancar abierto?
 *
 * En jsdom no hay `matchMedia`, así que se asume escritorio: los tests ven el
 * contenido, igual que en un navegador de escritorio.
 */
function prefersOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

export interface CollapsibleSectionProps {
  /** Encabezado visible y nombre accesible del bloque. */
  title: string;
  /** `id` del encabezado, para enlazarlo desde donde haga falta. */
  titleId?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Sección plegable con `<details>` nativo.
 *
 * En móvil los bloques de apoyo (hitos, actividad, carga, método) se pliegan
 * para que lo accionable quede arriba sin desplazar; en escritorio hay sitio de
 * sobra y arrancan abiertos. Se usa `<details>`/`<summary>` porque trae el
 * comportamiento de teclado y de lector de pantalla gratis: no hay que
 * reimplementar nada para que sea accesible.
 */
export function CollapsibleSection({
  title,
  titleId,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(prefersOpen);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setOpen(media.matches);

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return (
    <details
      className={clsx(styles.details, className)}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={styles.summary}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <span className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
