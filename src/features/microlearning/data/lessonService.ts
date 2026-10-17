/**
 * Servicio de aplicación del microlearning: contenido, motor y persistencia.
 *
 * `buildRecommendations` recibe la ruta de estudio como parámetro en lugar de
 * leerla del repositorio de diagnóstico: así el microlearning no depende de la
 * otra feature y la UI decide qué intento usar.
 */

import { loadLessons } from '@/data/content/loadLessons';
import type { StudyRoute } from '@/domain/diagnostic';
import type { Lesson, LessonEvaluation, LessonProgress } from '@/domain/lesson';
import { completeProgress, createProgress, recordAnswer, resolveResumeIndex } from '../engine/progress';
import { recommendLessons, type LessonRecommendation } from '../engine/recommend';
import { evaluateLesson } from '../engine/scoring';
import { getLessonRepository } from './repository';

export function listLessons(): Lesson[] {
  return loadLessons();
}

export function getLessonById(lessonId: string): Lesson | undefined {
  return listLessons().find((lesson) => lesson.id === lessonId);
}

export async function loadProgressMap(): Promise<Record<string, LessonProgress>> {
  return getLessonRepository().getProgressMap();
}

export async function buildRecommendations(
  route: StudyRoute | null = null,
  limit = 3,
): Promise<LessonRecommendation[]> {
  const progressMap = await loadProgressMap();
  return recommendLessons(listLessons(), progressMap, route, limit);
}

export interface LessonSession {
  lesson: Lesson;
  progress: LessonProgress;
  /** Paso por el que reanudar. */
  stepIndex: number;
  answers: Record<string, string[]>;
  /** true si se reanuda una lección a medias. */
  resumed: boolean;
}

/** Prepara la sesión: reanuda si hay progreso a medias, si no empieza limpia. */
export async function beginLesson(lessonId: string): Promise<LessonSession> {
  const lesson = getLessonById(lessonId);
  if (!lesson) {
    throw new Error(`No existe la lección "${lessonId}".`);
  }

  const existing = await getLessonRepository().getProgress(lessonId);
  const resumable = existing && existing.status === 'in-progress';

  if (!resumable) {
    const progress = createProgress(lesson);
    await getLessonRepository().saveProgress(progress);
    return { lesson, progress, stepIndex: 0, answers: {}, resumed: false };
  }

  return {
    lesson,
    progress: existing,
    stepIndex: resolveResumeIndex(lesson, existing),
    answers: existing.answers,
    resumed: true,
  };
}

/** Reinicia la lección desde cero, descartando el progreso anterior. */
export async function restartLesson(lessonId: string): Promise<LessonSession> {
  const lesson = getLessonById(lessonId);
  if (!lesson) {
    throw new Error(`No existe la lección "${lessonId}".`);
  }

  const progress = createProgress(lesson);
  await getLessonRepository().saveProgress(progress);
  return { lesson, progress, stepIndex: 0, answers: {}, resumed: false };
}

/** Registra una respuesta (o el avance de un escenario) y persiste el progreso. */
export async function persistStepAnswer(
  lesson: Lesson,
  progress: LessonProgress,
  stepId: string,
  selectedOptionIds: readonly string[],
  nextStepIndex: number,
  now: Date = new Date(),
): Promise<LessonProgress> {
  const updated = recordAnswer(lesson, progress, stepId, selectedOptionIds, nextStepIndex, now);
  await getLessonRepository().saveProgress(updated);
  return updated;
}

/** Persiste solo el avance (pasos de escenario, que no se evalúan). */
export async function persistAdvance(
  progress: LessonProgress,
  nextStepIndex: number,
  now: Date = new Date(),
): Promise<LessonProgress> {
  const updated = { ...progress, currentStepIndex: nextStepIndex, updatedAt: now.toISOString() };
  await getLessonRepository().saveProgress(updated);
  return updated;
}

/** Cierra la lección: evalúa y persiste el resultado. */
export async function finishLesson(
  lesson: Lesson,
  progress: LessonProgress,
  now: Date = new Date(),
): Promise<{ progress: LessonProgress; evaluation: LessonEvaluation }> {
  const evaluation = evaluateLesson(lesson, progress.answers);
  const completed = completeProgress(progress, evaluation, now);
  await getLessonRepository().saveProgress(completed);
  return { progress: completed, evaluation };
}
