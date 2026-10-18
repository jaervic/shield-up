/**
 * Modelo de tarjeta y registro de repaso para el motor de Spaced Repetition.
 *
 * Módulo PURO: define los tipos que comparten el motor, la capa de datos y la UI.
 * No importa React, Dexie ni ningún framework.
 */

import type { DomainId } from './domain';

/** Familias de conocimiento que entrena el SRS. */
export type CardType = 'port' | 'acronym' | 'crypto' | 'concept';

export const CARD_TYPES: readonly CardType[] = ['port', 'acronym', 'crypto', 'concept'] as const;

/**
 * Calificación del usuario tras revelar la tarjeta.
 * Se mapea a la escala 0..5 del algoritmo SM-2.
 */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'] as const;

/** Equivalencia con la escala clásica de SM-2 (q). */
export const GRADE_SCORE: Readonly<Record<Grade, number>> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

export const GRADE_LABELS_ES: Readonly<Record<Grade, string>> = {
  again: 'Otra vez',
  hard: 'Difícil',
  good: 'Bien',
  easy: 'Fácil',
};

/** Tarjeta persistida. Todos los campos son serializables (JSON-safe). */
export interface Card {
  id: string;
  domain: DomainId;
  type: CardType;
  front: string;
  back: string;
  /** Pista opcional que se muestra antes de revelar la respuesta. */
  hint?: string;
  tags: string[];
  /** Factor de facilidad SM-2. Nunca por debajo de MIN_EASE_FACTOR. */
  easeFactor: number;
  /** Intervalo actual en días. 0 = tarjeta nueva. */
  intervalDays: number;
  /** Repasos correctos consecutivos. */
  repetitions: number;
  /** Veces que el usuario falló la tarjeta. */
  lapses: number;
  /** Fecha ISO en la que la tarjeta vuelve a estar disponible. */
  dueAt: string;
  createdAt: string;
  lastReviewedAt: string | null;
  /** Las tarjetas suspendidas se excluyen de la cola de repaso. */
  suspended: boolean;
}

/** Registro inmutable de cada repaso. Fuente de verdad para las métricas. */
export interface Review {
  id: string;
  cardId: string;
  reviewedAt: string;
  grade: Grade;
  score: number;
  prevIntervalDays: number;
  nextIntervalDays: number;
  prevEaseFactor: number;
  nextEaseFactor: number;
  /** Días transcurridos desde el repaso anterior (o desde createdAt si es el primero). */
  elapsedDays: number;
  /**
   * Confianza declarada ANTES de revelar la respuesta. Es opcional: el usuario
   * puede revelar sin valorarla, y entonces el repaso no entra en el cálculo de
   * calibración.
   */
  confidence?: Confidence;
}

/**
 * Juicio de aprendizaje previo al revelado.
 * Declararlo mejora la retención y permite medir la calibración.
 */
export type Confidence = 'sure' | 'unsure';

export const CONFIDENCE_LABELS_ES: Readonly<Record<Confidence, string>> = {
  sure: 'Lo tenía seguro',
  unsure: 'Dudaba',
};

/** Forma del contenido cargado desde /content/flashcards/*.json. */
export interface CardSeed {
  id: string;
  domain: DomainId;
  type: CardType;
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
}
