import { GRADE_LABELS_ES, GRADES, type Grade } from '@/domain/card';
import { Button, type ButtonTone } from '@/shared/ui/Button';
import styles from './GradeButtons.module.css';

export interface GradeButtonsProps {
  onGrade: (grade: Grade) => void;
  disabled?: boolean;
}

const TONE_BY_GRADE: Record<Grade, ButtonTone> = {
  again: 'danger',
  hard: 'warning',
  good: 'success',
  easy: 'neutral',
};

const SHORTCUT_BY_GRADE: Record<Grade, string> = {
  again: '1',
  hard: '2',
  good: '3',
  easy: '4',
};

/** Botones de calificación con atajos de teclado 1-4 (accesibilidad + velocidad). */
export function GradeButtons({ onGrade, disabled = false }: GradeButtonsProps) {
  return (
    <div className={styles.group} role="group" aria-label="Califica tu recuerdo">
      {GRADES.map((grade) => (
        <Button
          key={grade}
          tone={TONE_BY_GRADE[grade]}
          disabled={disabled}
          onClick={() => onGrade(grade)}
          className={styles.gradeButton}
        >
          {GRADE_LABELS_ES[grade]}
          <span className={styles.kbd} aria-hidden="true">
            {SHORTCUT_BY_GRADE[grade]}
          </span>
        </Button>
      ))}
    </div>
  );
}
