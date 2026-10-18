/**
 * Reparto de cuotas por dominio.
 *
 * Se usa tanto en el diagnóstico como en el simulador de examen: ambos reparten
 * una cantidad de preguntas entre los cinco dominios en proporción a su peso
 * oficial, sin superar lo que hay en cada pool.
 */

import { DOMAIN_IDS, DOMAIN_WEIGHTS, type DomainId } from '@/domain/domain';

/**
 * Reparte `count` elementos entre dominios según los pesos.
 * Garantiza que la suma sea `min(count, total disponible)`.
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
