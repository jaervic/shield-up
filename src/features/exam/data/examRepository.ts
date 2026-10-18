/**
 * Contrato de persistencia del simulador de examen.
 * Solo se guardan los intentos entregados.
 */

import type { ExamAttempt } from '@/domain/exam';

export interface ExamRepository {
  saveAttempt(attempt: ExamAttempt): Promise<void>;
  getAttempts(): Promise<ExamAttempt[]>;
  getLatestAttempt(): Promise<ExamAttempt | null>;
  clear(): Promise<void>;
}
