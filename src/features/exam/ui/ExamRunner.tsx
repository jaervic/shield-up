import { useCallback, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { QuestionCard } from '@/shared/ui/QuestionCard';
import { EXAM_PASS_SCORE } from '@/domain/exam';
import { formatClock, isTimeRunningOut } from '../engine/timer';
import {
  countAnswered,
  countFlagged,
  selectCurrentQuestion,
  selectCurrentSelection,
  useExamStore,
} from '../state/examStore';
import { useExamTimer } from '../state/useExamTimer';
import styles from './ExamPage.module.css';

/** Ejecución del simulacro: cronómetro, navegador y pregunta actual. */
export function ExamRunner() {
  const questions = useExamStore((state) => state.questions);
  const index = useExamStore((state) => state.index);
  const answers = useExamStore((state) => state.answers);
  const flagged = useExamStore((state) => state.flagged);
  const startedAt = useExamStore((state) => state.startedAt);
  const durationMinutes = useExamStore((state) => state.durationMinutes);
  const submitting = useExamStore((state) => state.status === 'submitting');

  const question = useExamStore(selectCurrentQuestion);
  const selection = useExamStore(selectCurrentSelection);
  const toggleOption = useExamStore((state) => state.toggleOption);
  const toggleFlag = useExamStore((state) => state.toggleFlag);
  const goTo = useExamStore((state) => state.goTo);
  const next = useExamStore((state) => state.next);
  const previous = useExamStore((state) => state.previous);
  const submit = useExamStore((state) => state.submit);

  const [confirming, setConfirming] = useState(false);

  // Al agotarse el tiempo se entrega sola. Se lee el estado del store en el
  // momento, no del render, para no entregar dos veces.
  const handleExpire = useCallback(() => {
    const current = useExamStore.getState();
    if (current.status === 'running') void current.submit(true);
  }, []);

  const timer = useExamTimer(startedAt, durationMinutes, handleExpire);

  const answered = countAnswered(questions, answers);
  const flaggedCount = countFlagged(questions, flagged);
  const isFlagged = question !== null && flagged[question.id] === true;

  if (question === null) {
    return <p role="status">Preparando la pregunta…</p>;
  }

  return (
    <div className={styles.runner}>
      <div className={styles.bar}>
        <p
          className={isTimeRunningOut(timer.remainingSeconds) ? styles.clockLow : styles.clock}
          role="timer"
          aria-label="Tiempo restante"
        >
          {formatClock(timer.remainingSeconds)}
        </p>
        <p className={styles.barMeta}>
          {answered}/{questions.length} respondidas · {flaggedCount} marcadas · aprueba con{' '}
          {EXAM_PASS_SCORE}/900
        </p>
      </div>

      <nav className={styles.navigator} aria-label="Navegador de preguntas">
        <ul className={styles.navigatorList} role="list">
          {questions.map((item, position) => {
            const isAnswered = (answers[item.id]?.length ?? 0) > 0;
            const isMarked = flagged[item.id] === true;
            const classes = [
              styles.navCell,
              isAnswered ? styles.navAnswered : '',
              isMarked ? styles.navFlagged : '',
              position === index ? styles.navCurrent : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={classes}
                  aria-current={position === index ? 'true' : undefined}
                  aria-label={`Pregunta ${position + 1}${isAnswered ? ', respondida' : ', sin responder'}${
                    isMarked ? ', marcada para revisar' : ''
                  }`}
                  onClick={() => goTo(position)}
                >
                  {position + 1}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <QuestionCard
        question={question}
        selectedOptionIds={selection}
        onToggle={(optionId) => toggleOption(question.id, optionId)}
        position={index + 1}
        total={questions.length}
      />

      <div className={styles.actions}>
        <Button onClick={previous} disabled={index === 0}>
          Anterior
        </Button>
        <Button tone="warning" onClick={() => toggleFlag(question.id)} aria-pressed={isFlagged}>
          {isFlagged ? 'Quitar marca' : 'Marcar para revisar'}
        </Button>
        {index === questions.length - 1 ? (
          <Button variant="primary" onClick={() => setConfirming(true)} disabled={submitting}>
            Entregar
          </Button>
        ) : (
          <Button variant="primary" onClick={next}>
            Siguiente
          </Button>
        )}
      </div>

      {confirming ? (
        <div className={styles.confirm} role="alertdialog" aria-label="Confirmar entrega">
          <p>
            Vas a entregar con <strong>{questions.length - answered}</strong> preguntas sin
            responder y <strong>{flaggedCount}</strong> marcadas para revisar.
          </p>
          <div className={styles.confirmActions}>
            <Button variant="primary" onClick={() => void submit(false)} disabled={submitting}>
              {submitting ? 'Corrigiendo…' : 'Entregar ahora'}
            </Button>
            <Button onClick={() => setConfirming(false)}>Seguir repasando</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
