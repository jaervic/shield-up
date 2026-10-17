/**
 * Estado de la sesión de una lección (Zustand).
 *
 * El store no corrige ni calcula puntuaciones: delega en `lessonService` →
 * `engine`. Solo mantiene el paso actual, la selección y si ya se reveló.
 */

import { create } from 'zustand';
import type { Lesson, LessonEvaluation, LessonProgress } from '@/domain/lesson';
import { isDecisionStep } from '@/domain/lesson';
import { clamp } from '@/shared/utils/math';
import {
  beginLesson,
  finishLesson,
  persistAdvance,
  persistStepAnswer,
  restartLesson,
} from '../data/lessonService';

export type LessonSessionStatus = 'idle' | 'loading' | 'studying' | 'completed' | 'error';

export interface LessonState {
  status: LessonSessionStatus;
  error: string | null;
  lesson: Lesson | null;
  progress: LessonProgress | null;
  stepIndex: number;
  answers: Record<string, string[]>;
  /** true cuando el paso actual ya muestra su explicación. */
  revealed: boolean;
  /** true si la sesión se reanudó desde un progreso guardado. */
  resumed: boolean;
  evaluation: LessonEvaluation | null;

  start: (lessonId: string) => Promise<void>;
  toggleOption: (optionId: string) => void;
  submitStep: () => Promise<void>;
  nextStep: () => Promise<void>;
  restart: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  status: 'idle' as LessonSessionStatus,
  error: null,
  lesson: null,
  progress: null,
  stepIndex: 0,
  answers: {} as Record<string, string[]>,
  revealed: false,
  resumed: false,
  evaluation: null,
};

export const useLessonStore = create<LessonState>((set, get) => ({
  ...initialState,

  async start(lessonId) {
    set({ status: 'loading', error: null });
    try {
      const session = await beginLesson(lessonId);
      const current = session.lesson.steps[session.stepIndex];

      set({
        status: 'studying',
        lesson: session.lesson,
        progress: session.progress,
        stepIndex: session.stepIndex,
        answers: session.answers,
        revealed: Boolean(current && session.answers[current.id]?.length),
        resumed: session.resumed,
        evaluation: null,
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido al abrir la lección.',
      });
    }
  },

  toggleOption(optionId) {
    const { lesson, stepIndex, answers } = get();
    const step = lesson?.steps[stepIndex];
    if (!lesson || !step || !isDecisionStep(step)) return;

    const current = answers[step.id] ?? [];
    const next =
      step.answerType === 'single'
        ? current.includes(optionId)
          ? []
          : [optionId]
        : current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];

    set({ answers: { ...answers, [step.id]: next } });
  },

  async submitStep() {
    const { lesson, progress, stepIndex, answers } = get();
    const step = lesson?.steps[stepIndex];
    if (!lesson || !progress || !step) return;

    try {
      if (isDecisionStep(step)) {
        const updated = await persistStepAnswer(
          lesson,
          progress,
          step.id,
          answers[step.id] ?? [],
          stepIndex + 1,
        );
        set({ revealed: true, progress: updated });
      } else {
        const updated = await persistAdvance(
          progress,
          clamp(stepIndex + 1, 0, lesson.steps.length - 1),
        );
        set({ revealed: true, progress: updated });
      }
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido al guardar el paso.',
      });
    }
  },

  async nextStep() {
    const { lesson, progress, stepIndex } = get();
    if (!lesson || !progress) return;

    const isLast = stepIndex >= lesson.steps.length - 1;

    if (isLast) {
      try {
        const { progress: completed, evaluation } = await finishLesson(lesson, progress);
        set({ status: 'completed', progress: completed, evaluation });
      } catch (error) {
        set({
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido al cerrar la lección.',
        });
      }
      return;
    }

    const nextIndex = stepIndex + 1;
    const nextStep = lesson.steps[nextIndex];
    set({
      stepIndex: nextIndex,
      revealed: Boolean(nextStep && progress.answers[nextStep.id]?.length),
    });
  },

  async restart() {
    const { lesson } = get();
    if (!lesson) return;

    set({ status: 'loading' });
    try {
      const session = await restartLesson(lesson.id);
      set({
        status: 'studying',
        progress: session.progress,
        stepIndex: session.stepIndex,
        answers: session.answers,
        revealed: false,
        resumed: false,
        evaluation: null,
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido al reiniciar.',
      });
    }
  },

  reset() {
    set({ ...initialState });
  },
}));

const EMPTY_SELECTION: string[] = [];

/** Paso actual (referencia estable). */
export function selectCurrentStep(state: LessonState) {
  return state.lesson?.steps[state.stepIndex] ?? null;
}

/** Selección del paso actual (referencia estable). */
export function selectCurrentSelection(state: LessonState): string[] {
  const step = state.lesson?.steps[state.stepIndex];
  if (!step) return EMPTY_SELECTION;
  return state.answers[step.id] ?? EMPTY_SELECTION;
}

/**
 * Decisiones respondidas sobre el total.
 * Es una función pura (no un selector) para no devolver un objeto nuevo en cada
 * render, lo que rompería `useSyncExternalStore`.
 */
export function countAnsweredDecisions(
  lesson: Lesson | null,
  answers: Readonly<Record<string, string[]>>,
): { answered: number; total: number } {
  if (!lesson) return { answered: 0, total: 0 };

  const decisionSteps = lesson.steps.filter(isDecisionStep);
  const answered = decisionSteps.filter((step) => (answers[step.id]?.length ?? 0) > 0).length;

  return { answered, total: decisionSteps.length };
}
