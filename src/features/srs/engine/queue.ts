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
import { DOMAIN_IDS, DOMAIN_WEIGHTS, type DomainId } from '@/domain/domain';
import { isDue } from '@/shared/utils/date';

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

/**
 * Generador mulberry32: rápido, determinista y sin dependencias.
 * Devuelve números en el rango [0, 1).
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Fisher-Yates sin mutar la entrada. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = result[i];
    const b = result[j];
    if (a === undefined || b === undefined) continue;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

/**
 * Mezcla tarjetas de varios dominios con distribución proporcional a `weights`.
 * Algoritmo: en cada paso se elige el dominio con menor "progreso normalizado"
 * (usadas / peso), lo que produce un reparto cuasi-óptimo y determinista.
 *
 * Se preserva el orden de entrada dentro de cada dominio: así las tarjetas
 * vencidas (previamente ordenadas por antigüedad) mantienen su prioridad.
 */
export function interleaveByDomain(
  cards: readonly Card[],
  weights: Readonly<Record<DomainId, number>> = DOMAIN_WEIGHTS,
): Card[] {
  const groups = new Map<DomainId, Card[]>();
  for (const id of DOMAIN_IDS) {
    groups.set(id, []);
  }
  for (const card of cards) {
    groups.get(card.domain)?.push(card);
  }

  const active = new Map<DomainId, Card[]>();
  for (const [id, group] of groups) {
    if (group.length > 0) {
      active.set(id, group);
    }
  }

  const progress = new Map<DomainId, number>();
  for (const id of active.keys()) {
    progress.set(id, 0);
  }

  const result: Card[] = [];
  while (result.length < cards.length) {
    let bestId: DomainId | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const [id, group] of active) {
      const used = progress.get(id) ?? 0;
      if (used >= group.length) continue;
      const weight = weights[id] > 0 ? weights[id] : 1 / DOMAIN_IDS.length;
      const score = (used + 1) / weight;
      if (score < bestScore - 1e-9) {
        bestScore = score;
        bestId = id;
      }
    }

    if (bestId === null) break;

    const group = active.get(bestId);
    const used = progress.get(bestId) ?? 0;
    const card = group?.[used];
    if (!card) break;

    result.push(card);
    progress.set(bestId, used + 1);
  }

  return result;
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
