/**
 * Punto de extensión del motor de repetición espaciada.
 *
 * La UI y el store dependen de la interfaz `Scheduler`, nunca de SM-2
 * directamente. Migrar a FSRS (el algoritmo moderno de Anki) consiste en
 * añadir un objeto que cumpla esta interfaz y registrarlo en `SCHEDULERS`,
 * sin tocar componentes ni la capa de datos.
 */

import { GRADE_SCORE, type Card, type Grade, type Review } from '@/domain/card';
import { createId } from '@/shared/utils/id';
import { fullDaysBetween } from '@/shared/utils/date';
import { schedule as sm2Schedule } from './sm2';

export interface Scheduler {
  readonly id: SchedulerId;
  readonly label: string;
  schedule(card: Card, grade: Grade, now?: Date): Card;
}

export const SCHEDULER_IDS = ['sm2', 'fsrs'] as const;
export type SchedulerId = (typeof SCHEDULER_IDS)[number];

export const sm2Scheduler: Scheduler = {
  id: 'sm2',
  label: 'SM-2 (SuperMemo 2)',
  schedule: sm2Schedule,
};

const SCHEDULERS: Record<SchedulerId, Scheduler | null> = {
  sm2: sm2Scheduler,
  // Reservado: se implementará con parámetros calibrados cuando exista historial.
  fsrs: null,
};

export function getScheduler(id: SchedulerId = 'sm2'): Scheduler {
  const scheduler = SCHEDULERS[id];
  if (!scheduler) {
    throw new Error(`El scheduler "${id}" todavía no está implementado.`);
  }
  return scheduler;
}

/**
 * Construye el registro de repaso a partir del estado anterior y el nuevo.
 * Se mantiene aquí (y no en SM-2) para que sea reutilizable por cualquier scheduler.
 */
export function createReviewRecord(
  before: Card,
  after: Card,
  grade: Grade,
  now: Date = new Date(),
): Review {
  const previousReference = before.lastReviewedAt ? new Date(before.lastReviewedAt) : new Date(before.createdAt);
  return {
    id: createId('rev'),
    cardId: before.id,
    reviewedAt: now.toISOString(),
    grade,
    score: GRADE_SCORE[grade],
    prevIntervalDays: before.intervalDays,
    nextIntervalDays: after.intervalDays,
    prevEaseFactor: before.easeFactor,
    nextEaseFactor: after.easeFactor,
    elapsedDays: fullDaysBetween(previousReference, now),
  };
}
