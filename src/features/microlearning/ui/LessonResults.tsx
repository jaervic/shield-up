import { Link } from 'react-router-dom';
import { getDomain } from '@/domain/domain';
import type { Lesson, LessonEvaluation } from '@/domain/lesson';
import { isDecisionStep } from '@/domain/lesson';
import { Button } from '@/shared/ui/Button';
import styles from './LessonResults.module.css';

export interface LessonResultsProps {
  lesson: Lesson;
  evaluation: LessonEvaluation;
  onRestart: () => void;
}

export function LessonResults({ lesson, evaluation, onRestart }: LessonResultsProps) {
  const takeaways = lesson.steps
    .filter(isDecisionStep)
    .map((step) => step.takeaway)
    .filter((value): value is string => Boolean(value));

  return (
    <section className={styles.results} aria-labelledby="lesson-results-title">
      <div className={styles.headline}>
        <p className={evaluation.passed ? styles.passed : styles.failed}>
          {evaluation.passed ? 'Lección superada' : 'Lección no superada'}
        </p>
        <h2 id="lesson-results-title">{lesson.title}</h2>
        <p className={styles.domain}>
          D{lesson.domain} · {getDomain(lesson.domain).nameEs}
        </p>

        <dl className={styles.scores}>
          <div>
            <dt>Decisiones correctas</dt>
            <dd>
              {evaluation.correctDecisions}/{evaluation.totalDecisions}
            </dd>
          </div>
          <div>
            <dt>Resultado</dt>
            <dd>{evaluation.scorePercent}%</dd>
          </div>
        </dl>

        {!evaluation.passed ? (
          <p className={styles.note}>
            El umbral de superación es el 80%. Repite la lección cuando quieras: no cuenta como
            examen.
          </p>
        ) : null}
      </div>

      {takeaways.length > 0 ? (
        <div className={styles.takeaways}>
          <h3>Ideas clave</h3>
          <ul role="list">
            {takeaways.map((takeaway) => (
              <li key={takeaway}>{takeaway}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.actions}>
        <Link className={styles.primaryLink} to="/lessons">
          Ver todas las lecciones
        </Link>
        <Link className={styles.secondaryLink} to="/review">
          Repasar tarjetas
        </Link>
        <Button onClick={onRestart}>Repetir lección</Button>
      </div>
    </section>
  );
}
