/**
 * Corrección de una lección.
 *
 * Solo cuentan como evaluación los pasos de tipo `decision`: los `scenario`
 * son informativos y sirven para plantear el problema antes de decidir.
 */

import { isDecisionStep, type Lesson, type LessonEvaluation, type LessonStep } from '@/domain/lesson';
import { matchesCorrectSet } from '@/shared/utils/answer';

/** Umbral de superación de una lección (80% de las decisiones correctas). */
export const PASS_THRESHOLD = 0.8;

export function gradeStep(step: LessonStep, selectedOptionIds: readonly string[]): boolean {
  if (!isDecisionStep(step)) return false;
  return matchesCorrectSet(step.correctOptionIds, selectedOptionIds);
}

export function countDecisions(lesson: Lesson): number {
  return lesson.steps.filter(isDecisionStep).length;
}

export function evaluateLesson(
  lesson: Lesson,
  answers: Readonly<Record<string, string[]>>,
): LessonEvaluation {
  const decisionSteps = lesson.steps.filter(isDecisionStep);

  let correctDecisions = 0;
  for (const step of decisionSteps) {
    if (gradeStep(step, answers[step.id] ?? [])) {
      correctDecisions += 1;
    }
  }

  const totalDecisions = decisionSteps.length;
  const ratio = totalDecisions > 0 ? correctDecisions / totalDecisions : 0;

  return {
    lessonId: lesson.id,
    totalDecisions,
    correctDecisions,
    scorePercent: Math.round(ratio * 100),
    passed: totalDecisions > 0 && ratio >= PASS_THRESHOLD,
  };
}
