import { clsx } from 'clsx';
import type { LessonStep } from '@/domain/lesson';
import styles from './LessonStepView.module.css';

export interface LessonStepViewProps {
  step: LessonStep;
  selectedOptionIds: readonly string[];
  revealed: boolean;
  /** Solo tiene sentido en pasos de decisión ya revelados. */
  isCorrect: boolean;
  onToggle: (optionId: string) => void;
  position: number;
  total: number;
}

export function LessonStepView({
  step,
  selectedOptionIds,
  revealed,
  isCorrect,
  onToggle,
  position,
  total,
}: LessonStepViewProps) {
  const isDecision = step.kind === 'decision';

  return (
    <article className={styles.step} aria-labelledby={`step-${step.id}-title`}>
      <header className={styles.header}>
        <span className={styles.badge}>
          {isDecision ? 'Decide' : 'Escenario'}
        </span>
        <span className={styles.position}>
          Paso {position} de {total}
        </span>
      </header>

      <h2 id={`step-${step.id}-title`} className={styles.title}>
        {step.title}
      </h2>

      {isDecision ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.prompt}>{step.prompt}</legend>

          <ul className={styles.options} role="list">
            {step.options.map((option) => {
              const checked = selectedOptionIds.includes(option.id);
              const isCorrectOption = revealed && step.correctOptionIds.includes(option.id);
              const isWrongPick = revealed && checked && !isCorrectOption;

              return (
                <li key={option.id}>
                  <label
                    className={clsx(
                      styles.option,
                      checked && styles.optionChecked,
                      isCorrectOption && styles.optionCorrect,
                      isWrongPick && styles.optionWrong,
                    )}
                  >
                    <input
                      className={styles.input}
                      type={step.answerType === 'single' ? 'radio' : 'checkbox'}
                      name={`step-${step.id}`}
                      value={option.id}
                      checked={checked}
                      disabled={revealed}
                      onChange={() => onToggle(option.id)}
                    />
                    <span className={styles.optionText}>{option.text}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <p className={styles.hint}>
            {step.answerType === 'single'
              ? 'Selecciona una respuesta.'
              : 'Selecciona todas las respuestas correctas.'}
          </p>
        </fieldset>
      ) : (
        <p className={styles.prompt}>{step.prompt}</p>
      )}

      {revealed ? (
        <div
          className={clsx(
            styles.feedback,
            'reveal',
            isDecision && (isCorrect ? styles.ok : styles.ko),
          )}
          aria-live="polite"
        >
          {isDecision ? (
            <p className={styles.verdict}>{isCorrect ? 'Correcto' : 'No era la mejor opción'}</p>
          ) : null}
          <p className={styles.explanation}>{step.explanation}</p>
          {step.takeaway ? (
            <p className={styles.takeaway}>
              <strong>Idea clave:</strong> {step.takeaway}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
