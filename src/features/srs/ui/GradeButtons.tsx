import { GRADE_LABELS_ES, GRADES, type Grade } from '@/domain/card';
import { Button, type ButtonTone } from '@/shared/ui/Button';
import styles from './GradeButtons.module.css';

export interface GradeButtonsProps {
  onGrade: (grade: Grade) => void;
  disabled?: boolean;
}

/**
 * Rampa de calificación: ámbar → neutro → verde → violeta.
 *
 * El rojo queda fuera a propósito. En esta app el rojo es el color de MARCA
 * (navegación, acciones, progreso), y usar el mismo tono para "lo has fallado"
 * haría que marca y error se confundieran. Además, "Otra vez" en ámbar lee
 * como "esto vuelve pronto", que es exactamente lo que hace el sistema.
 */
const TONE_BY_GRADE: Record<Grade, ButtonTone> = {
  again: 'warning',
  hard: 'neutral',
  good: 'success',
  easy: 'accent',
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
