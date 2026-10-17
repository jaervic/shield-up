/**
 * Algoritmo SM-2 (SuperMemo 2) — implementación pura y determinista.
 *
 * Referencia: P.A. Wozniak, "Optimization of learning" (1990).
 *
 * Reglas implementadas:
 *  - Calificación q en escala 0..5 (ver GRADE_SCORE en domain/card).
 *  - Factor de facilidad:  EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 *  - EF nunca baja de 1.3 ni sube de 3.0 (techo de seguridad anti-runaway).
 *  - q < 3 (fallo): repetitions = 0, interval = 1 día, EF -= 0.2, lapses + 1.
 *  - q >= 3: interval = 1, luego 6, luego round(interval * EF').
 *    Con q = 3 ("Difícil") el intervalo se multiplica además por 0.8 para que
 *    "Difícil" sea perceptiblemente más corto que "Bien" (desviación consciente
 *    del SM-2 original, documentada para poder revertirla o migrar a FSRS).
 *
 * `schedule()` es una función pura: no muta la tarjeta de entrada y no lee el reloj
 * del sistema salvo por el parámetro `now` (inyectable → tests deterministas).
 */

import { GRADE_SCORE, type Card, type Grade } from '@/domain/card';
import { addDays } from '@/shared/utils/date';
import { clamp, round2 } from '@/shared/utils/math';

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const MAX_EASE_FACTOR = 3.0;
export const FIRST_INTERVAL_DAYS = 1;
export const SECOND_INTERVAL_DAYS = 6;
export const LAPSE_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 365 * 2;
/**
 * Con q = 3 ("Difícil") el intervalo se multiplica por 0.8. Es una desviación
 * consciente del SM-2 original: sin ella, el descenso del EF hacía que
 * "Difícil" produjese intervalos MÁS LARGOS que "Bien". Documentado y
 * testeado para poder revertirlo o migrar a FSRS.
 */
export const HARD_INTERVAL_MULTIPLIER = 0.8;
export const LAPSE_EASE_PENALTY = 0.2;

/** Aplica la fórmula de SM-2 al factor de facilidad. */
export function calculateEaseFactor(currentEaseFactor: number, score: number): number {
  const delta = 0.1 - (5 - score) * (0.08 + (5 - score) * 0.02);
  return clamp(currentEaseFactor + delta, MIN_EASE_FACTOR, MAX_EASE_FACTOR);
}

/**
 * Calcula el siguiente intervalo en días.
 * `easeFactor` es el EF ya actualizado (se usa el valor nuevo, simplificación
 * habitual respecto al SM-2 original que reutiliza el EF del paso anterior).
 */
export function nextIntervalDays(card: Card, score: number, easeFactor: number): number {
  if (score < 3) {
    return LAPSE_INTERVAL_DAYS;
  }
  if (card.repetitions === 0) {
    return FIRST_INTERVAL_DAYS;
  }
  if (card.repetitions === 1) {
    return SECOND_INTERVAL_DAYS;
  }
  const multiplier = score === 3 ? HARD_INTERVAL_MULTIPLIER : 1;
  const raw = card.intervalDays * easeFactor * multiplier;
  return clamp(Math.round(raw), 1, MAX_INTERVAL_DAYS);
}

/**
 * Programa el siguiente repaso de una tarjeta.
 * @returns una NUEVA tarjeta; la original no se modifica.
 */
export function schedule(card: Card, grade: Grade, now: Date = new Date()): Card {
  const score = GRADE_SCORE[grade];
  const passed = score >= 3;

  const easeFactor = passed
    ? calculateEaseFactor(card.easeFactor, score)
    : clamp(card.easeFactor - LAPSE_EASE_PENALTY, MIN_EASE_FACTOR, MAX_EASE_FACTOR);

  const intervalDays = nextIntervalDays(card, score, easeFactor);

  return {
    ...card,
    easeFactor: round2(easeFactor),
    intervalDays,
    repetitions: passed ? card.repetitions + 1 : 0,
    lapses: passed ? card.lapses : card.lapses + 1,
    dueAt: addDays(now, intervalDays).toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}
