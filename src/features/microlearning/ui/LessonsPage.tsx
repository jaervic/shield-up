import { Link } from 'react-router-dom';
import { DOMAINS } from '@/domain/domain';
import type { Lesson, LessonProgress } from '@/domain/lesson';
import { useLatestDiagnostic } from '@/features/diagnostic/state/useDiagnostic';
import { LoadingSkeleton } from '@/shared/ui/Skeleton';
import { useLessonCatalog, useLessonRecommendations } from '../state/useLessons';
import styles from './LessonsPage.module.css';

interface StatusInfo {
  label: string;
  tone: 'idle' | 'active' | 'done';
}

function describeStatus(progress: LessonProgress | undefined): StatusInfo {
  if (!progress) return { label: 'Sin empezar', tone: 'idle' };
  if (progress.status === 'completed') {
    return { label: `Superada · ${progress.scorePercent}%`, tone: 'done' };
  }
  return { label: `En curso · ${progress.scorePercent}%`, tone: 'active' };
}

/** Catálogo de lecciones con recomendaciones ligadas a la ruta de estudio. */
export function LessonsPage() {
  const { data: catalog, isPending, isError } = useLessonCatalog();
  const { data: attempt } = useLatestDiagnostic();
  const route = attempt?.route ?? null;
  const { data: recommendations } = useLessonRecommendations(route, 3);

  if (isPending) {
    return <LoadingSkeleton label="Cargando lecciones…" lines={4} />;
  }

  if (isError || !catalog) {
    return <p role="alert">No se pudieron cargar las lecciones.</p>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Lecciones</h1>
        <p>
          Cada lección plantea un problema real y te obliga a decidir antes de explicarte la
          respuesta. Sin muros de texto: primero piensas, luego lees.
        </p>
      </header>

      {recommendations && recommendations.length > 0 ? (
        <section aria-labelledby="recommended-title">
          <h2 id="recommended-title">Recomendadas para ti</h2>
          {!route ? (
            <p className={styles.noRoute}>
              Todavía no has hecho el <Link to="/diagnostic">test de diagnóstico</Link>: el orden se
              basa en el peso de cada dominio en el examen.
            </p>
          ) : null}
          <ol className={styles.recommendations} role="list">
            {recommendations.map((recommendation, position) => (
              <li key={recommendation.lessonId} className={styles.recommendation}>
                <span className={styles.rank} aria-hidden="true">
                  {position + 1}
                </span>
                <div className={styles.recommendationBody}>
                  <Link className={styles.lessonLink} to={`/lessons/${recommendation.lessonId}`}>
                    {recommendation.title}
                  </Link>
                  <p className={styles.reason}>{recommendation.reason}</p>
                  <p className={styles.meta}>
                    D{recommendation.domain} · ~{recommendation.estimatedMinutes} min
                    {recommendation.completed ? ` · Ya superada (${recommendation.scorePercent}%)` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby="catalog-title">
        <h2 id="catalog-title">Todas las lecciones</h2>
        <div className={styles.domains}>
          {DOMAINS.map((domain) => {
            const lessons = catalog.lessons.filter((lesson) => lesson.domain === domain.id);
            const summary = catalog.byDomain[domain.id];

            return (
              <section key={domain.id} className={styles.domainBlock}>
                <header className={styles.domainHeader}>
                  <h3>
                    <span
                      className={styles.dot}
                      style={{ backgroundColor: `var(--domain-${domain.id})` }}
                      aria-hidden="true"
                    />
                    D{domain.id} · {domain.nameEs}
                  </h3>
                  <p className={styles.domainMeta}>
                    {summary.completed}/{summary.total} superadas
                    {summary.averageScore !== null ? ` · media ${summary.averageScore}%` : ''}
                  </p>
                </header>

                {lessons.length === 0 ? (
                  <p className={styles.empty}>Aún no hay lecciones en este dominio.</p>
                ) : (
                  <ul className={styles.list} role="list">
                    {lessons.map((lesson) => (
                      <LessonListItem
                        key={lesson.id}
                        lesson={lesson}
                        progress={catalog.progress[lesson.id]}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function LessonListItem({ lesson, progress }: { lesson: Lesson; progress?: LessonProgress }) {
  const status = describeStatus(progress);

  return (
    <li className={styles.item}>
      <div className={styles.itemBody}>
        <Link className={styles.lessonLink} to={`/lessons/${lesson.id}`}>
          {lesson.title}
        </Link>
        <p className={styles.summary}>{lesson.summary}</p>
        <p className={styles.meta}>
          ~{lesson.estimatedMinutes} min · {lesson.steps.length} pasos · dificultad{' '}
          {lesson.difficulty === 'easy' ? 'baja' : lesson.difficulty === 'medium' ? 'media' : 'alta'}
        </p>
      </div>
      <span className={`${styles.status} ${styles[status.tone]}`}>{status.label}</span>
    </li>
  );
}
