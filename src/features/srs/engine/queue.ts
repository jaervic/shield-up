/**
 * Construcción de la cola diaria de repaso.
 *
 * Objetivos de diseño:
 *  - Priorizar tarjetas vencidas por antigüedad (las más olvidadas primero).
 *  - Limitar las tarjetas nuevas por sesión para evitar avalanchas.
 *  - Intercalar por dominio en proporción a los pesos del examen (28% Dom4,
 *    22% Dom2, ...) en lugar de agrupar por bloques: es la base del
 *    "interleaving", que mejora la retención a largo plazo.
 *  - Ser determinista dado un `seed`, para poder testear sin flakiness.
 */

import type { Card } from '@/domain/card';
import { DOMAIN_WEIGHTS, type DomainId } from '@/domain/domain';
import { isDue } from '@/shared/utils/date';
import { interleaveByDomain } from '@/shared/utils/interleave';
import { createRng, shuffle } from '@/shared/utils/random';

// Se re-exportan desde el motor para no romper los puntos de import existentes.
export { createRng, shuffle, interleaveByDomain };

export const DEFAULT_NEW_LIMIT = 20;
export const DEFAULT_REVIEW_LIMIT = 200;

export interface QueueOptions {
  /** Máximo de tarjetas nuevas introducidas en la sesión. */
  newLimit?: number;
  /** Máximo de tarjetas de repaso vencidas en la sesión. */
  reviewLimit?: number;
  /** Semilla del generador aleatorio para resultados reproducibles. */
  seed?: number;
  /** Pesos por dominio; por defecto los del blueprint del examen. */
  weights?: Readonly<Record<DomainId, number>>;
}

export interface DailyQueue {
  /** Tarjetas ya ordenadas para la sesión. */
  cards: Card[];
  dueCount: number;
  newCount: number;
  /** Total de tarjetas elegibles (vencidas + nuevas), sin aplicar límites. */
  availableCount: number;
}

/** Arma la cola de repaso del día. */
export function buildDailyQueue(
  cards: readonly Card[],
  now: Date = new Date(),
  options: QueueOptions = {},
): DailyQueue {
  const {
    newLimit = DEFAULT_NEW_LIMIT,
    reviewLimit = DEFAULT_REVIEW_LIMIT,
    seed = 1,
    weights = DOMAIN_WEIGHTS,
  } = options;

  const rng = createRng(seed);
  const active = cards.filter((card) => !card.suspended);

  const due = active
    .filter((card) => card.repetitions > 0 && isDue(card.dueAt, now))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const fresh = active.filter((card) => card.repetitions === 0);

  const dueSelected = due.slice(0, Math.max(0, reviewLimit));
  const newSelected = shuffle(fresh, rng).slice(0, Math.max(0, newLimit));

  return {
    cards: interleaveByDomain([...dueSelected, ...newSelected], weights),
    dueCount: dueSelected.length,
    newCount: newSelected.length,
    availableCount: due.length + fresh.length,
  };
}
