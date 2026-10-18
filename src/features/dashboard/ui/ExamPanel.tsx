import { Link } from 'react-router-dom';
import { EXAM_MAX_QUESTIONS, EXAM_MAX_SCORE, EXAM_PASS_SCORE } from '@/domain/exam';
import { formatDateTime } from '@/shared/utils/format';
import { planExam } from '@/features/exam/data/examService';
import { useLatestExam } from '@/features/exam/state/useExam';
import styles from './ExamPanel.module.css';

/**
 * Acceso al simulador desde el panel.
 *
 * No está en la navegación a propósito: el simulacro es una actividad
 * periódica, no diaria, y seis secciones no caben en la barra inferior del
 * móvil sin truncar las etiquetas.
 */
export function ExamPanel() {
  const { data: latest, isPending } = useLatestExam();
  const plan = planExam();

  return (
    <section className={styles.panel} aria-labelledby="exam-panel-title">
      <h2 id="exam-panel-title">Simulacro de examen</h2>

      {isPending ? (
        <p className={styles.text} role="status">
          Cargando…
        </p>
      ) : latest === null || latest === undefined ? (
        <p className={styles.text}>
          {plan.questionCount} preguntas · {plan.durationMinutes} min · se aprueba con{' '}
          {EXAM_PASS_SCORE}/{EXAM_MAX_SCORE}. Sin corrección hasta que entregas.
        </p>
      ) : (
        <p className={styles.text}>
          Último resultado: <strong>{latest.scaledScore}/{EXAM_MAX_SCORE}</strong>{' '}
          {latest.passed ? '(aprobado)' : '(no aprobado)'} · {formatDateTime(latest.completedAt)}
        </p>
      )}

      <Link className={styles.cta} to="/exam">
        {latest === null || latest === undefined ? 'Hacer un simulacro' : 'Repetir simulacro'}
      </Link>

      {plan.bankSize < EXAM_MAX_QUESTIONS ? (
        <p className={styles.note}>
          El banco tiene {plan.bankSize} de las {EXAM_MAX_QUESTIONS} preguntas del examen real: el
          simulacro es proporcional.
        </p>
      ) : null}
    </section>
  );
}
