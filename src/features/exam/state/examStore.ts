/**
 * Estado del simulacro (Zustand).
 *
 * El store no corrige: recoge respuestas y marcas, y delega la corrección en
 * `examService` → `engine`.
 */

import { create } from 'zustand';
import type { ExamAttempt } from '@/domain/exam';
import type { Question } from '@/domain/question';
import { buildExam, planExam, submitExam } from '../data/examService';

export type ExamStatus = 'idle' | 'loading' | 'running' | 'submitting' | 'done' | 'error';

export interface ExamState {
  status: ExamStatus;
  error: string | null;
  questions: Question[];
  /** questionId → opciones seleccionadas. */
  answers: Record<string, string[]>;
  /** questionId → marcada para revisar. */
  flagged: Record<string, boolean>;
  index: number;
  startedAt: string | null;
  durationMinutes: number;
  attempt: ExamAttempt | null;

  start: () => Promise<void>;
  toggleOption: (questionId: string, optionId: string) => void;
  toggleFlag: (questionId: string) => void;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  submit: (timeExpired?: boolean) => Promise<void>;
  reset: () => void;
}

const initialState = {
  status: 'idle' as ExamStatus,
  error: null,
  questions: [] as Question[],
  answers: {} as Record<string, string[]>,
  flagged: {} as Record<string, boolean>,
  index: 0,
  startedAt: null,
  durationMinutes: 0,
  attempt: null,
};

export const useExamStore = create<ExamState>((set, get) => ({
  ...initialState,

  async start() {
    set({ status: 'loading', error: null });
    try {
      const plan = planExam();
      const questions = buildExam();

      if (questions.length === 0) {
        set({ status: 'error', error: 'No hay preguntas disponibles en el banco.' });
        return;
      }

      set({
        status: 'running',
        questions,
        answers: {},
        flagged: {},
        index: 0,
        startedAt: new Date().toISOString(),
        durationMinutes: plan.durationMinutes,
        attempt: null,
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido al preparar el examen.',
      });
    }
  },

  toggleOption(questionId, optionId) {
    const { questions, answers } = get();
    const question = questions.find((candidate) => candidate.id === questionId);
    if (question === undefined) return;

    const current = answers[questionId] ?? [];
    const next =
      question.type === 'single'
        ? current.includes(optionId)
          ? []
          : [optionId]
        : current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];

    set({ answers: { ...answers, [questionId]: next } });
  },

  toggleFlag(questionId) {
    const { flagged } = get();
    set({ flagged: { ...flagged, [questionId]: !flagged[questionId] } });
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

  async submit(timeExpired = false) {
    const { questions, answers, flagged, startedAt, durationMinutes } = get();
    if (questions.length === 0 || startedAt === null) return;

    set({ status: 'submitting', error: null });

    try {
      const answeredAt = new Date().toISOString();
      const records = questions.map((question) => ({
        questionId: question.id,
        selectedOptionIds: [...(answers[question.id] ?? [])],
        flagged: flagged[question.id] === true,
        answeredAt,
      }));

      const attempt = await submitExam({
        questions,
        answers: records,
        startedAt,
        durationMinutes,
        timeExpired,
      });

      set({ status: 'done', attempt });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido al entregar.',
      });
    }
  },

  reset() {
    set({ ...initialState });
  },
}));

/** Pregunta actual (referencia estable). */
export function selectCurrentQuestion(state: ExamState): Question | null {
  return state.questions[state.index] ?? null;
}

/** Array estable para el caso «sin selección» (evita bucles en Zustand v5). */
const EMPTY_SELECTION: string[] = [];

export function selectCurrentSelection(state: ExamState): string[] {
  const question = state.questions[state.index];
  if (question === undefined) return EMPTY_SELECTION;
  return state.answers[question.id] ?? EMPTY_SELECTION;
}

/** Funciones puras (no selectores) para no devolver objetos nuevos en cada render. */
export function countAnswered(
  questions: readonly Question[],
  answers: Readonly<Record<string, string[]>>,
): number {
  return questions.reduce(
    (count, question) => count + ((answers[question.id]?.length ?? 0) > 0 ? 1 : 0),
    0,
  );
}

export function countFlagged(
  questions: readonly Question[],
  flagged: Readonly<Record<string, boolean>>,
): number {
  return questions.reduce(
    (count, question) => count + (flagged[question.id] === true ? 1 : 0),
    0,
  );
}
