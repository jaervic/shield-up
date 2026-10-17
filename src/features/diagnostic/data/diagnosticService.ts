/**
 * Servicio de aplicación del diagnóstico: orquesta contenido, motor y persistencia.
 */

import { loadQuestions } from '@/data/content/loadQuestions';
import type { DiagnosticAttempt } from '@/domain/diagnostic';
import type { Question } from '@/domain/question';
import { createId } from '@/shared/utils/id';
import { selectDiagnosticQuestions, type SelectionOptions } from '../engine/selection';
import { evaluateAttempt, type AttemptMeta } from '../engine/scoring';
import { getDiagnosticRepository } from './repository';

/** Selecciona las preguntas del test desde el banco de contenido. */
export function buildDiagnosticQuestions(options: SelectionOptions = {}): Question[] {
  return selectDiagnosticQuestions(loadQuestions(), options);
}

export interface FinalizeOptions {
  questions: readonly Question[];
  answers: Parameters<typeof evaluateAttempt>[1];
  startedAt: string;
  completedAt?: string;
  attemptId?: string;
}

/** Evalúa el intento y lo persiste. Devuelve el resultado completo. */
export async function finalizeDiagnostic(options: FinalizeOptions): Promise<DiagnosticAttempt> {
  const completedAt = options.completedAt ?? new Date().toISOString();
  const meta: AttemptMeta = {
    attemptId: options.attemptId ?? createId('diag'),
    startedAt: options.startedAt,
    completedAt,
  };

  const attempt = evaluateAttempt(options.questions, options.answers, meta);
  await getDiagnosticRepository().saveAttempt(attempt);
  return attempt;
}

export async function getLatestDiagnostic(): Promise<DiagnosticAttempt | null> {
  return getDiagnosticRepository().getLatestAttempt();
}

export async function getDiagnosticHistory(): Promise<DiagnosticAttempt[]> {
  return getDiagnosticRepository().getAttempts();
}
