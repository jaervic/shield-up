/**
 * Selección de las preguntas del test de diagnóstico.
 *
 * El reparto de preguntas por dominio imita la composición del examen: se
 * asignan cuotas proporcionales a los pesos oficiales y el remanente se
 * reparte entre los dominios con mayor déficit respecto a su cuota ideal.
 * La selección es determinista dada una semilla, lo que permite testearla.
 */

import { DOMAIN_IDS, DOMAIN_WEIGHTS, type DomainId } from '@/domain/domain';
import type { Question } from '@/domain/question';
import { interleaveByDomain } from '@/shared/utils/interleave';
import { createRng, shuffle } from '@/shared/utils/random';

export const DEFAULT_DIAGNOSTIC_LENGTH = 25;

export interface SelectionOptions {
  /** Número de preguntas del test. Por defecto 25. */
  count?: number;
  seed?: number;
  weights?: Readonly<Record<DomainId, number>>;
}

/**
 * Reparte `count` preguntas entre dominios según los pesos, sin superar el
 * tamaño de cada pool. Garantiza que la suma de cuotas sea
 * `min(count, total disponible)`.
 */
export function allocateQuotas(
  poolSizes: Readonly<Record<DomainId, number>>,
  count: number,
  weights: Readonly<Record<DomainId, number>> = DOMAIN_WEIGHTS,
): Record<DomainId, number> {
  const quotas = {} as Record<DomainId, number>;
  let assigned = 0;

  for (const id of DOMAIN_IDS) {
    const target = Math.floor(count * weights[id]);
    const quota = Math.min(target, poolSizes[id]);
    quotas[id] = quota;
    assigned += quota;
  }

  let remaining = count - assigned;
  while (remaining > 0) {
    let bestId: DomainId | null = null;
    let bestDeficit = Number.NEGATIVE_INFINITY;

    for (const id of DOMAIN_IDS) {
      if (quotas[id] >= poolSizes[id]) continue;
      const deficit = count * weights[id] - quotas[id];
      if (deficit > bestDeficit + 1e-9) {
        bestDeficit = deficit;
        bestId = id;
      }
    }

    if (bestId === null) break;
    quotas[bestId] += 1;
    remaining -= 1;
  }

  return quotas;
}

export function selectDiagnosticQuestions(
  questions: readonly Question[],
  options: SelectionOptions = {},
): Question[] {
  const requested = Math.max(1, options.count ?? DEFAULT_DIAGNOSTIC_LENGTH);
  const seed = options.seed ?? 1;
  const weights = options.weights ?? DOMAIN_WEIGHTS;
  const rng = createRng(seed);

  const byDomain = new Map<DomainId, Question[]>();
  for (const id of DOMAIN_IDS) {
    byDomain.set(id, []);
  }
  for (const question of questions) {
    byDomain.get(question.domain)?.push(question);
  }

  const poolSizes = {} as Record<DomainId, number>;
  for (const id of DOMAIN_IDS) {
    poolSizes[id] = byDomain.get(id)?.length ?? 0;
  }

  const target = Math.min(requested, questions.length);
  const quotas = allocateQuotas(poolSizes, target, weights);

  const selected: Question[] = [];
  for (const id of DOMAIN_IDS) {
    const pool = byDomain.get(id) ?? [];
    selected.push(...shuffle(pool, rng).slice(0, quotas[id]));
  }

  return interleaveByDomain(selected, weights);
}
