import { Link } from 'react-router-dom';
import { useLatestDiagnostic } from '@/features/diagnostic/state/useDiagnostic';
import { useLessonRecommendations } from '@/features/microlearning/state/useLessons';
import styles from './RecommendedLessonsPanel.module.css';

/**
 * Puente entre la ruta de estudio y el microlearning: las tres lecciones que
 * más aportan ahora mismo, heredando la prioridad por dominio del diagnóstico.
 */
export function RecommendedLessonsPanel() {
  const { data: attempt } = useLatestDiagnostic();
  const route = attempt?.route ?? null;
  const { data: recommendations, isPending } = useLessonRecommendations(route, 3);

  return (
    <section className={styles.panel} aria-labelledby="lessons-title">
      <h2 id="lessons-title">Lecciones recomendadas</h2>

      {isPending ? (
        <p role="status">Cargando recomendaciones…</p>
      ) : !recommendations || recommendations.length === 0 ? (
        <p className={styles.empty}>No hay lecciones disponibles.</p>
      ) : (
        <ol className={styles.list} role="list">
          {recommendations.map((recommendation) => (
            <li key={recommendation.lessonId} className={styles.item}>
              <Link className={styles.link} to={`/lessons/${recommendation.lessonId}`}>
                {recommendation.title}
              </Link>
              <p className={styles.reason}>{recommendation.reason}</p>
              <p className={styles.meta}>
                D{recommendation.domain} · ~{recommendation.estimatedMinutes} min
                {recommendation.completed ? ` · superada (${recommendation.scorePercent}%)` : ''}
              </p>
            </li>
          ))}
        </ol>
      )}

      <Link className={styles.cta} to="/lessons">
        Ver todas las lecciones
      </Link>
    </section>
  );
}
