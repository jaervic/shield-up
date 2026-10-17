/**
 * Construcción y actualización del progreso de una lección.
 *
 * El progreso se guarda paso a paso (no solo al final), de modo que el usuario
 * puede cerrar la app a mitad de lección y reanudarla donde estaba.
 */

import type { Lesson, LessonEvaluation, LessonProgress } from '@/domain/lesson';
import { DOMAIN_IDS, type DomainId } from '@/domain/domain';
import { clamp } from '@/shared/utils/math';
import { evaluateLesson } from './scoring';

export function createProgress(lesson: Lesson, now: Date = new Date()): LessonProgress {
  const timestamp = now.toISOString();
  return {
    lessonId: lesson.id,
    domain: lesson.domain,
    status: 'in-progress',
    currentStepIndex: 0,
    answers: {},
    correctDecisions: 0,
    totalDecisions: lesson.steps.filter((step) => step.kind === 'decision').length,
    scorePercent: 0,
    startedAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };
}

/** Registra una respuesta y recalcula el marcador parcial. */
export function recordAnswer(
  lesson: Lesson,
  progress: LessonProgress,
  stepId: string,
  selectedOptionIds: readonly string[],
  nextStepIndex: number,
  now: Date = new Date(),
): LessonProgress {
  const answers = { ...progress.answers, [stepId]: [...selectedOptionIds] };
  const evaluation = evaluateLesson(lesson, answers);

  return {
    ...progress,
    answers,
    currentStepIndex: clamp(nextStepIndex, 0, lesson.steps.length - 1),
    correctDecisions: evaluation.correctDecisions,
    totalDecisions: evaluation.totalDecisions,
    scorePercent: evaluation.scorePercent,
    updatedAt: now.toISOString(),
  };
}

/** Marca la lección como completada con el resultado final. */
export function completeProgress(
  progress: LessonProgress,
  evaluation: LessonEvaluation,
  now: Date = new Date(),
): LessonProgress {
  return {
    ...progress,
    status: 'completed',
    correctDecisions: evaluation.correctDecisions,
    totalDecisions: evaluation.totalDecisions,
    scorePercent: evaluation.scorePercent,
    currentStepIndex: 0,
    updatedAt: now.toISOString(),
    completedAt: now.toISOString(),
  };
}

/** Índice del paso por el que reanudar, acotado a los límites de la lección. */
export function resolveResumeIndex(lesson: Lesson, progress: LessonProgress | null): number {
  if (!progress) return 0;
  return clamp(progress.currentStepIndex, 0, Math.max(0, lesson.steps.length - 1));
}

export interface DomainLessonSummary {
  domain: DomainId;
  total: number;
  completed: number;
  inProgress: number;
  /** Media de scorePercent de las lecciones completadas; null si no hay ninguna. */
  averageScore: number | null;
}

export function summarizeByDomain(
  lessons: readonly Lesson[],
  progressByLesson: Readonly<Record<string, LessonProgress>>,
): Record<DomainId, DomainLessonSummary> {
  const result = {} as Record<DomainId, DomainLessonSummary>;
  for (const id of DOMAIN_IDS) {
    result[id] = { domain: id, total: 0, completed: 0, inProgress: 0, averageScore: null };
  }

  const scores = new Map<DomainId, number[]>();

  for (const lesson of lessons) {
    const summary = result[lesson.domain];
    summary.total += 1;

    const progress = progressByLesson[lesson.id];
    if (!progress) continue;

    if (progress.status === 'completed') {
      summary.completed += 1;
      const list = scores.get(lesson.domain) ?? [];
      list.push(progress.scorePercent);
      scores.set(lesson.domain, list);
    } else {
      summary.inProgress += 1;
    }
  }

  for (const id of DOMAIN_IDS) {
    const list = scores.get(id) ?? [];
    result[id].averageScore =
      list.length > 0 ? Math.round(list.reduce((sum, value) => sum + value, 0) / list.length) : null;
  }

  return result;
}
