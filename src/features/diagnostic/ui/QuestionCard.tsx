import { clsx } from 'clsx';
import { getDomain } from '@/domain/domain';
import type { Question } from '@/domain/question';
import styles from './QuestionCard.module.css';

export interface QuestionCardProps {
  question: Question;
  selectedOptionIds: readonly string[];
  onToggle: (optionId: string) => void;
  position: number;
  total: number;
}

export function QuestionCard({
  question,
  selectedOptionIds,
  onToggle,
  position,
  total,
}: QuestionCardProps) {
  const domain = getDomain(question.domain);
  const inputType = question.type === 'single' ? 'radio' : 'checkbox';

  return (
    <article className={styles.card} aria-labelledby={`q-${question.id}-stem`}>
      <header className={styles.header}>
        <span className={styles.badge} style={{ borderColor: `var(--domain-${question.domain})` }}>
          D{question.domain} · Objetivo {question.objective}
        </span>
        <span className={styles.position}>
          Pregunta {position} de {total}
        </span>
      </header>

      <fieldset className={styles.fieldset}>
        <legend id={`q-${question.id}-stem`} className={styles.stem}>
          {question.stem}
        </legend>

        <ul className={styles.options} role="list">
          {question.options.map((option) => {
            const checked = selectedOptionIds.includes(option.id);
            return (
              <li key={option.id}>
                <label className={clsx(styles.option, checked && styles.optionChecked)}>
                  <input
                    className={styles.input}
                    type={inputType}
                    name={`question-${question.id}`}
                    value={option.id}
                    checked={checked}
                    onChange={() => onToggle(option.id)}
                  />
                  <span className={styles.optionText}>{option.text}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <p className={styles.hint}>
        {question.type === 'single'
          ? 'Selecciona una única respuesta.'
          : 'Selecciona todas las respuestas correctas.'}{' '}
        <span className={styles.domainName}>({domain.nameEs})</span>
      </p>
    </article>
  );
}
