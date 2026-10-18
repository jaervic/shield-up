/**
 * Modelo del simulador de examen.
 *
 * Reproduce las condiciones del SY0-701: una duración con cuenta atrás, la
 * posibilidad de marcar preguntas para revisarlas y una puntuación escalada
 * sobre 900 con 750 como aprobado.
 *
 * Módulo PURO.
 */

import type { DomainId } from './domain';
import type { AnswerRecord } from './question';

export interface ExamAnswerRecord extends AnswerRecord {
  /** Marcada para revisar antes de entregar. */
  flagged: boolean;
}

export interface ExamDomainResult {
  domain: DomainId;
  asked: number;
  correct: number;
  /** 0..1 */
  accuracy: number;
}

export interface ExamAttempt {
  id: string;
  startedAt: string;
  completedAt: string;
  /** Duración prevista, en minutos. */
  durationMinutes: number;
  /** Segundos realmente empleados. */
  elapsedSeconds: number;
  /** true si se agotó el tiempo y se entregó sola. */
  timeExpired: boolean;
  questionIds: string[];
  answers: ExamAnswerRecord[];
  totalQuestions: number;
  correctCount: number;
  /** 0..100 */
  scorePercent: number;
  /** Puntuación escalada 100..900, como el examen real. */
  scaledScore: number;
  passed: boolean;
  byDomain: Record<DomainId, ExamDomainResult>;
}

/** Escala oficial: de 100 a 900 puntos, con 750 como aprobado. */
export const EXAM_MIN_SCORE = 100;
export const EXAM_MAX_SCORE = 900;
export const EXAM_PASS_SCORE = 750;

/** Duración oficial máxima del SY0-701, en minutos. */
export const EXAM_DURATION_MINUTES = 90;
/** Preguntas máximas del examen real. */
export const EXAM_MAX_QUESTIONS = 90;
/** Minutos por pregunta, para escalar la duración al tamaño del banco. */
export const MINUTES_PER_QUESTION = 1.5;
