/**
 * Estado de la sesión del test de diagnóstico (Zustand).
 *
 * El store no puntúa ni genera la ruta: recoge respuestas y delega en
 * `diagnosticService` → `engine`.
 */

import { create } from 'zustand';
import type { DiagnosticAttempt } from '@/domain/diagnostic';
import type { AnswerRecord, Question } from '@/domain/question';
import { buildDiagnosticQuestions, finalizeDiagnostic } from '../data/diagnosticService';

export type DiagnosticStatus =
  | 'idle'
  | 'loading'
  | 'in-progress'
  | 'submitting'
  | 'completed'
  | 'error';

export interface DiagnosticState {
  status: DiagnosticStatus;
  error: string | null;
  questions: Question[];
  /** questionId → ids de opción seleccionados. */
  answers: Record<string, string[]>;
  index: number;
  startedAt: string | null;
  attempt: DiagnosticAttempt | null;

  start: (count?: number) => Promise<void>;
  toggleOption: (questionId: string, optionId: string) => void;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  submit: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  status: 'idle' as DiagnosticStatus,
  error: null,
  questions: [] as Question[],
  answers: {} as Record<string, string[]>,
  index: 0,
  startedAt: null,
  attempt: null,
};

export const useDiagnosticStore = create<DiagnosticState>((set, get) => ({
  ...initialState,

  async start(count) {
    set({ status: 'loading', error: null });
    try {
      const questions = buildDiagnosticQuestions(count === undefined ? {} : { count });
      if (questions.length === 0) {
        set({ status: 'error', error: 'No hay preguntas disponibles en el banco.' });
        return;
      }
      set({
        status: 'in-progress',
        questions,
        answers: {},
        index: 0,
        startedAt: new Date().toISOString(),
        attempt: null,
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido al cargar el test.',
      });
    }
  },

  toggleOption(questionId, optionId) {
    const { questions, answers } = get();
    const question = questions.find((candidate) => candidate.id === questionId);
    if (!question) return;

    const current = answers[questionId] ?? [];
    let next: string[];

    if (question.type === 'single') {
      next = current.includes(optionId) ? [] : [optionId];
    } else {
      next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
    }

    set({ answers: { ...answers, [questionId]: next } });
  },

  goTo(index) {
    const { questions } = get();
    set({ index: Math.max(0, Math.min(index, questions.length - 1)) });
  },

  next() {
    get().goTo(get().index + 1);
  },

  previous() {
    get().goTo(get().index - 1);
  },

  async submit() {
    const { questions, answers, startedAt } = get();
    if (questions.length === 0) return;

    set({ status: 'submitting', error: null });

    try {
      const answeredAt = new Date().toISOString();
      const records: AnswerRecord[] = questions.map((question) => {
        const selectedOptionIds = answers[question.id] ?? [];
        return {
          questionId: question.id,
          selectedOptionIds: [...selectedOptionIds],
          // `isCorrect` se recalcula en el motor; aquí queda como marcador.
          isCorrect: false,
          answeredAt,
        };
      });

      const attempt = await finalizeDiagnostic({
        questions,
        answers: records,
        startedAt: startedAt ?? answeredAt,
      });

      set({ status: 'completed', attempt });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido al evaluar el test.',
      });
    }
  },

  reset() {
    set({ ...initialState });
  },
}));

/** Pregunta actual (referencia estable). */
export function selectCurrentQuestion(state: DiagnosticState): Question | null {
  return state.questions[state.index] ?? null;
}

/**
 * Referencia estable para el caso "sin selección". Devolver un array nuevo en
 * cada render rompería `useSyncExternalStore` (bucle de re-render en Zustand v5).
 */
const EMPTY_SELECTION: string[] = [];

/** Opciones seleccionadas para la pregunta actual (referencia estable). */
export function selectCurrentSelection(state: DiagnosticState): string[] {
  const question = state.questions[state.index];
  if (!question) return EMPTY_SELECTION;
  return state.answers[question.id] ?? EMPTY_SELECTION;
}

/** Número de preguntas respondidas. */
export function selectAnsweredCount(state: DiagnosticState): number {
  return state.questions.reduce(
    (count, question) => count + ((state.answers[question.id]?.length ?? 0) > 0 ? 1 : 0),
    0,
  );
}
