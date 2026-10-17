/**
 * Modelo de pregunta del banco de evaluación.
 *
 * Módulo PURO. Las preguntas viven en /content/questions/*.json y se validan
 * con Zod antes de usarse.
 */

import type { DomainId } from './domain';

/** `single` = una sola respuesta correcta; `multiple` = varias. */
export type QuestionType = 'single' | 'multiple';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'] as const;

export interface QuestionOption {
  /** Identificador corto y estable: 'a', 'b', 'c', ... */
  id: string;
  text: string;
}

export interface Question {
  id: string;
  domain: DomainId;
  /** Sub-objetivo del blueprint, p. ej. "4.3". */
  objective: string;
  type: QuestionType;
  stem: string;
  options: QuestionOption[];
  /** IDs de las opciones correctas. Para `single`, exactamente una. */
  correctOptionIds: string[];
  explanation: string;
  difficulty: Difficulty;
  tags: string[];
}

/** Respuesta del usuario a una pregunta concreta. */
export interface AnswerRecord {
  questionId: string;
  /** Vacío si el usuario la saltó. */
  selectedOptionIds: string[];
  isCorrect: boolean;
  answeredAt: string;
}
