import { Link } from 'react-router-dom';
import type { DiagnosticAttempt } from '@/domain/diagnostic';
import { getDomain } from '@/domain/domain';
import { formatPercent } from '@/shared/utils/format';
import styles from './DiagnosticResults.module.css';

export interface DiagnosticResultsProps {
  attempt: DiagnosticAttempt;
  onRetake: () => void;
}

export function DiagnosticResults({ attempt, onRetake }: DiagnosticResultsProps) {
  return (
    <div className={styles.results}>
      <section className={styles.headline} aria-labelledby="results-title">
        <h2 id="results-title">Resultado del diagnóstico</h2>

        <dl className={styles.scores}>
          <div>
            <dt>Preparación estimada</dt>
            <dd>{attempt.readinessPercent}%</dd>
            <p className={styles.scoreNote}>Ponderada por el peso de cada dominio en el examen</p>
          </div>
          <div>
            <dt>Aciertos</dt>
            <dd>
              {attempt.correctCount}/{attempt.totalQuestions}
            </dd>
            <p className={styles.scoreNote}>{attempt.scorePercent}% de respuestas correctas</p>
          </div>
        </dl>
      </section>

      <section aria-labelledby="domains-title">
        <h2 id="domains-title">Rendimiento por dominio</h2>
        <table className={styles.table}>
          <caption className="visually-hidden">
            Aciertos y precisión por dominio del examen
          </caption>
          <thead>
            <tr>
              <th scope="col">Dominio</th>
              <th scope="col">Peso</th>
              <th scope="col">Aciertos</th>
              <th scope="col">Precisión</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(attempt.proficiencyByDomain).map((entry) => {
              const domain = getDomain(entry.domain);
              return (
                <tr key={entry.domain}>
                  <th scope="row">
                    <span
                      className={styles.dot}
                      style={{ backgroundColor: `var(--domain-${entry.domain})` }}
                      aria-hidden="true"
                    />
                    D{entry.domain} · {domain.nameEs}
                  </th>
                  <td>{Math.round(domain.weight * 100)}%</td>
                  <td>
                    {entry.correct}/{entry.asked}
                  </td>
                  <td>{entry.evaluated ? formatPercent(entry.accuracy) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="route-title">
        <h2 id="route-title">Tu ruta de estudio</h2>
        <p className={styles.routeIntro}>
          Ordenada por impacto: peso en el examen × hueco de conocimiento. Empieza por{' '}
          <strong>{getDomain(attempt.route.focusDomain).nameEs}</strong>.
        </p>
        <ol className={styles.route} role="list">
          {attempt.route.steps.map((step, position) => (
            <li key={step.domain} className={styles.routeStep}>
              <span className={styles.routeRank} aria-hidden="true">
                {position + 1}
              </span>
              <div className={styles.routeBody}>
                <p className={styles.routeTitle}>
                  D{step.domain} · {getDomain(step.domain).nameEs}
                  <span className={styles.routeCards}>
                    ~{step.estimatedCards} tarjetas sugeridas
                  </span>
                </p>
                <p className={styles.routeReason}>{step.reason}</p>
                <p className={styles.routePriority}>Prioridad: {step.priority.toFixed(3)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.actions}>
        <Link className={styles.primaryLink} to="/review">
          Empezar a repasar
        </Link>
        <button type="button" className={styles.secondaryButton} onClick={onRetake}>
          Repetir el test
        </button>
      </div>
    </div>
  );
}
