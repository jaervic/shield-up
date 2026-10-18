import { Link } from 'react-router-dom';
import type { ExamAttempt } from '@/domain/exam';
import { EXAM_MAX_SCORE, EXAM_PASS_SCORE } from '@/domain/exam';
import { getDomain } from '@/domain/domain';
import { loadQuestions } from '@/data/content/loadQuestions';
import { formatClock } from '../engine/timer';
import { Button } from '@/shared/ui/Button';
import styles from './ExamPage.module.css';

export interface ExamResultsProps {
  attempt: ExamAttempt;
  onRetry: () => void;
}

/** Resultado del simulacro: puntuación escalada, dominios y repaso de fallos. */
export function ExamResults({ attempt, onRetry }: ExamResultsProps) {
  const questions = loadQuestions();
  const byId = new Map(questions.map((question) => [question.id, question]));

  const incorrect = attempt.answers.filter((answer) => !answer.isCorrect);
  const flagged = attempt.answers.filter((answer) => answer.flagged);

  return (
    <div className={styles.results}>
      <section className={styles.scoreCard} aria-labelledby="exam-results-title">
        <p className={attempt.passed ? styles.passed : styles.failed}>
          {attempt.passed ? 'Aprobado' : 'No aprobado'}
        </p>
        <h1 id="exam-results-title">Simulacro terminado</h1>

        <dl className={styles.scores}>
          <div>
            <dt>Puntuación</dt>
            <dd>
              {attempt.scaledScore}
              <span className={styles.scale}>/{EXAM_MAX_SCORE}</span>
            </dd>
          </div>
          <div>
            <dt>Aciertos</dt>
            <dd>
              {attempt.correctCount}/{attempt.totalQuestions}
            </dd>
          </div>
          <div>
            <dt>Precisión</dt>
            <dd>{attempt.scorePercent}%</dd>
          </div>
          <div>
            <dt>Tiempo</dt>
            <dd>{formatClock(attempt.elapsedSeconds)}</dd>
          </div>
        </dl>

        <p className={styles.threshold}>
          Se aprueba con {EXAM_PASS_SCORE}/{EXAM_MAX_SCORE}.
          {attempt.timeExpired ? ' Se agotó el tiempo y el examen se entregó solo.' : ''}
        </p>
      </section>

      <section aria-labelledby="exam-domains-title">
        <h2 id="exam-domains-title">Por dominio</h2>
        <div className={styles.scrollRegion} role="region" aria-label="Resultado por dominio" tabIndex={0}>
          <table className={styles.table}>
            <caption className="visually-hidden">Aciertos por dominio del examen</caption>
            <thead>
              <tr>
                <th scope="col">Dominio</th>
                <th scope="col">Peso</th>
                <th scope="col">Aciertos</th>
                <th scope="col">Precisión</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(attempt.byDomain).map((entry) => {
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
                    <td>{entry.asked > 0 ? `${Math.round(entry.accuracy * 100)}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {incorrect.length > 0 ? (
        <section className={styles.review} aria-labelledby="exam-review-title">
          <h2 id="exam-review-title">Qué falló ({incorrect.length})</h2>
          <ul className={styles.reviewList} role="list">
            {incorrect.slice(0, 12).map((answer) => {
              const question = byId.get(answer.questionId);
              if (question === undefined) return null;

              const correctTexts = question.options
                .filter((option) => question.correctOptionIds.includes(option.id))
                .map((option) => option.text)
                .join(' · ');

              return (
                <li key={answer.questionId} className={styles.reviewItem}>
                  <p className={styles.reviewStem}>
                    <span className={styles.reviewDomain} style={{ color: `var(--domain-${question.domain})` }}>
                      D{question.domain}
                    </span>{' '}
                    {question.stem}
                  </p>
                  <p className={styles.reviewAnswer}>
                    <strong>Correcto:</strong> {correctTexts}
                  </p>
                  <p className={styles.reviewExplanation}>{question.explanation}</p>
                </li>
              );
            })}
          </ul>
          {incorrect.length > 12 ? (
            <p className={styles.more}>…y {incorrect.length - 12} más.</p>
          ) : null}
        </section>
      ) : null}

      {flagged.length > 0 ? (
        <p className={styles.flaggedNote}>
          Marcaste {flagged.length} {flagged.length === 1 ? 'pregunta' : 'preguntas'} para revisar;
          de ellas fallaste {flagged.filter((answer) => !answer.isCorrect).length}.
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="primary" onClick={onRetry}>
          Repetir simulacro
        </Button>
        <Link className={styles.link} to="/review">
          Repasar tarjetas
        </Link>
        <Link className={styles.link} to="/">
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
