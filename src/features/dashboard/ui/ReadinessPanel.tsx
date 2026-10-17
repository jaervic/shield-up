import { Link } from 'react-router-dom';
import { getDomain } from '@/domain/domain';
import { formatDateTime } from '@/shared/utils/format';
import { DEFAULT_DIAGNOSTIC_LENGTH } from '@/features/diagnostic/engine/selection';
import { useLatestDiagnostic } from '@/features/diagnostic/state/useDiagnostic';
import styles from './ReadinessPanel.module.css';

/**
 * Panel de preparación: resume el último diagnóstico y muestra la ruta de
 * estudio personalizada. Es el puente entre el test y el repaso diario.
 */
export function ReadinessPanel() {
  const { data: attempt, isPending } = useLatestDiagnostic();

  if (isPending) {
    return <p role="status">Cargando diagnóstico…</p>;
  }

  if (!attempt) {
    return (
      <section className={styles.panel} aria-labelledby="readiness-title">
        <h2 id="readiness-title">Preparación</h2>
        <p className={styles.empty}>
          Todavía no has hecho el test de diagnóstico. Son {DEFAULT_DIAGNOSTIC_LENGTH} preguntas y
          define por dónde empezar a estudiar según el peso de cada dominio en el examen.
        </p>
        <Link className={styles.cta} to="/diagnostic">
          Hacer el test de diagnóstico
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="readiness-title">
      <h2 id="readiness-title">Preparación</h2>

      <div className={styles.summary}>
        <p className={styles.readinessValue}>
          <span className={styles.readinessNumber}>{attempt.readinessPercent}%</span>
          <span className={styles.readinessLabel}>preparación estimada</span>
        </p>
        <p className={styles.meta}>
          Último test: {formatDateTime(attempt.completedAt)} · {attempt.correctCount}/
          {attempt.totalQuestions} aciertos
        </p>
      </div>

      <h3 className={styles.subtitle}>Ruta de estudio</h3>
      <ol className={styles.route} role="list">
        {attempt.route.steps.slice(0, 3).map((step, position) => (
          <li key={step.domain} className={styles.step}>
            <span className={styles.rank} aria-hidden="true">
              {position + 1}
            </span>
            <span className={styles.stepBody}>
              <span className={styles.stepTitle}>
                D{step.domain} · {getDomain(step.domain).nameEs}
              </span>
              <span className={styles.stepReason}>{step.reason}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        <Link className={styles.cta} to="/review">
          Repasar ahora
        </Link>
        <Link className={styles.secondary} to="/diagnostic">
          Repetir el test
        </Link>
      </div>
    </section>
  );
}
