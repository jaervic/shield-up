/**
 * Servicio del simulador: contenido, motor y persistencia.
 */

import { loadQuestions } from '@/data/content/loadQuestions';
import type { ExamAttempt } from '@/domain/exam';
import type { Question } from '@/domain/question';
import { createId } from '@/shared/utils/id';
import { buildExamQuestions, examDurationMinutes, examLengthFor } from '../engine/selection';
import { evaluateExam, type ExamAnswerInput, type ExamMeta } from '../engine/scoring';
import { examTimerState } from '../engine/timer';
import { getExamRepository } from './repository';

export interface ExamPlan {
  questionCount: number;
  durationMinutes: number;
  /** Cuántas preguntas hay en el banco, para poder avisar si falta contenido. */
  bankSize: number;
}

/** Plan del simulacro según el banco disponible. */
export function planExam(): ExamPlan {
  const bankSize = loadQuestions().length;
  const questionCount = examLengthFor(bankSize);

  return {
    questionCount,
    durationMinutes: examDurationMinutes(questionCount),
    bankSize,
  };
}

export function buildExam(seed?: number): Question[] {
  const bank = loadQuestions();
  const plan = planExam();
  return buildExamQuestions(bank, seed === undefined ? {} : { seed, count: plan.questionCount });
}

export interface SubmitExamOptions {
  questions: readonly Question[];
  answers: readonly ExamAnswerInput[];
  startedAt: string;
  durationMinutes: number;
  /** Fuerza el estado «tiempo agotado»; si no, se deduce del reloj. */
  timeExpired?: boolean;
  now?: Date;
}

/** Corrige y persiste el intento. */
export async function submitExam(options: SubmitExamOptions): Promise<ExamAttempt> {
  const now = options.now ?? new Date();
  const timer = examTimerState(options.startedAt, options.durationMinutes, now);

  const meta: ExamMeta = {
    attemptId: createId('exam'),
    startedAt: options.startedAt,
    completedAt: now.toISOString(),
    durationMinutes: options.durationMinutes,
    elapsedSeconds: timer.elapsedSeconds,
    timeExpired: options.timeExpired ?? timer.expired,
  };

  const attempt = evaluateExam(options.questions, options.answers, meta);
  await getExamRepository().saveAttempt(attempt);
  return attempt;
}

export async function getLatestExamAttempt(): Promise<ExamAttempt | null> {
  return getExamRepository().getLatestAttempt();
}

export async function getExamHistory(): Promise<ExamAttempt[]> {
  return getExamRepository().getAttempts();
}
