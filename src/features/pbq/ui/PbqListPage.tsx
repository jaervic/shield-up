import { Link } from 'react-router-dom';
import { getDomain } from '@/domain/domain';
import { LoadingSkeleton } from '@/shared/ui/Skeleton';
import { usePbqCatalog } from '../state/usePbq';
import styles from './PbqListPage.module.css';

const KIND_LABELS: Record<string, string> = {
  topology: 'Topología',
  terminal: 'Terminal',
};

/** Catálogo de PBQ con el mejor resultado conseguido en cada una. */
export function PbqListPage() {
  const { data, isPending, isError } = usePbqCatalog();

  if (isPending) {
    return <LoadingSkeleton label="Cargando simulaciones…" lines={4} />;
  }

  if (isError || !data) {
    return <p role="alert">No se pudieron cargar las simulaciones.</p>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Simulaciones</h1>
        <p>
          Aquí no se elige una opción: se resuelve. Coloca activos en su segmento o consigue el
          objetivo desde la terminal, con los mismos comandos que usarías en un equipo real.
        </p>
      </header>

      <ul className={styles.list} role="list">
        {data.pbq.map((pbq) => {
          const progress = data.progress[pbq.id];

          return (
            <li key={pbq.id} className={styles.item}>
              <div className={styles.itemBody}>
                <Link className={styles.link} to={`/pbq/${pbq.id}`}>
                  {pbq.title}
                </Link>
                <p className={styles.summary}>{pbq.summary}</p>
                <p className={styles.meta}>
                  {KIND_LABELS[pbq.kind]} · D{pbq.domain} · {getDomain(pbq.domain).nameEs} · ~
                  {pbq.estimatedMinutes} min · {pbq.blueprintObjectives.join(', ')}
                </p>
              </div>

              <span className={progress?.passed ? styles.done : styles.idle}>
                {progress === undefined
                  ? 'Sin intentar'
                  : `${progress.passed ? 'Superada' : 'Pendiente'} · ${progress.bestScorePercent}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
