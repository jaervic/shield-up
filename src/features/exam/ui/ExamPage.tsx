import { EXAM_MAX_QUESTIONS, EXAM_MAX_SCORE, EXAM_PASS_SCORE } from '@/domain/exam';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/shared/utils/format';
import { planExam } from '../data/examService';
import { isFullLengthExam } from '../engine/selection';
import { useExamStore } from '../state/examStore';
import { useLatestExam } from '../state/useExam';
import { ExamResults } from './ExamResults';
import { ExamRunner } from './ExamRunner';
import styles from './ExamPage.module.css';

/**
 * Simulador de examen.
 *
 * Una sola ruta con tres estados: presentación, ejecución y resultado. El
 * cronómetro y la entrega automática viven en `ExamRunner`.
 */
export function ExamPage() {
  const status = useExamStore((state) => state.status);
  const error = useExamStore((state) => state.error);
  const attempt = useExamStore((state) => state.attempt);
  const start = useExamStore((state) => state.start);
  const reset = useExamStore((state) => state.reset);

  const { data: latest } = useLatestExam();

  if (status === 'running' || status === 'submitting') {
    return <ExamRunner />;
  }

  if (status === 'done' && attempt !== null) {
    return (
      <ExamResults
        attempt={attempt}
        onRetry={() => {
          reset();
          void start();
        }}
      />
    );
  }

  if (status === 'loading') {
    return (
      <p className={styles.state} role="status">
        Preparando el simulacro…
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.state} role="alert">
        <p>No se pudo preparar el simulacro.</p>
        <p className={styles.errorDetail}>{error}</p>
        <Button variant="primary" onClick={() => void start()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const plan = planExam();
  const fullLength = isFullLengthExam(plan.bankSize);

  return (
    <div className={styles.intro}>
      <header>
        <h1 className={styles.title}>Simulador de examen</h1>
        <p className={styles.lead}>
          Las condiciones del SY0-701: cuenta atrás, preguntas marcadas para revisar y una
          puntuación sobre {EXAM_MAX_SCORE} con {EXAM_PASS_SCORE} para aprobar. No hay corrección
          hasta que entregas.
        </p>
      </header>

      <dl className={styles.plan}>
        <div>
          <dt>Preguntas</dt>
          <dd>{plan.questionCount}</dd>
        </div>
        <div>
          <dt>Tiempo</dt>
          <dd>{plan.durationMinutes} min</dd>
        </div>
        <div>
          <dt>Aprobado</dt>
          <dd>
            {EXAM_PASS_SCORE}/{EXAM_MAX_SCORE}
          </dd>
        </div>
      </dl>

      {fullLength ? null : (
        <p className={styles.note}>
          El banco tiene {plan.bankSize} preguntas y el examen real llega a {EXAM_MAX_QUESTIONS}:
          el simulacro usa todas las disponibles y ajusta la duración en consecuencia. Es un
          simulacro proporcional, no el examen completo.
        </p>
      )}

      {latest !== null && latest !== undefined ? (
        <p className={styles.lastResult}>
          Último simulacro: <strong>{latest.scaledScore}/{EXAM_MAX_SCORE}</strong>{' '}
          {latest.passed ? '(aprobado)' : '(no aprobado)'} · {formatDateTime(latest.completedAt)}
        </p>
      ) : null}

      <Button variant="primary" onClick={() => void start()}>
        Comenzar simulacro
      </Button>
    </div>
  );
}
