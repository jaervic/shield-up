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
import { allocateQuotas } from '@/shared/utils/quota';
import { createRng, shuffle } from '@/shared/utils/random';

// Se re-exporta desde aquí para no romper los puntos de import existentes.
export { allocateQuotas };

export const DEFAULT_DIAGNOSTIC_LENGTH = 25;

export interface SelectionOptions {
  /** Número de preguntas del test. Por defecto 25. */
  count?: number;
  seed?: number;
  weights?: Readonly<Record<DomainId, number>>;
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
