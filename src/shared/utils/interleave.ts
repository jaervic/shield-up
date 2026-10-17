/**
 * Interleaving ponderado por dominio.
 *
 * Se usa tanto en el SRS (mezclar tarjetas) como en el diagnóstico (mezclar
 * preguntas) para no agrupar por bloques temáticos.
 */

import { DOMAIN_IDS, DOMAIN_WEIGHTS, type DomainId } from '@/domain/domain';

/**
 * Mezcla elementos de varios dominios con distribución proporcional a `weights`.
 * Algoritmo: en cada paso se elige el dominio con menor "progreso normalizado"
 * (usados / peso), lo que produce un reparto cuasi-óptimo y determinista.
 *
 * Se preserva el orden de entrada dentro de cada dominio: así los elementos
 * previamente ordenados (por antigüedad, dificultad, etc.) mantienen su prioridad.
 */
export function interleaveByDomain<T extends { domain: DomainId }>(
  items: readonly T[],
  weights: Readonly<Record<DomainId, number>> = DOMAIN_WEIGHTS,
): T[] {
  const groups = new Map<DomainId, T[]>();
  for (const id of DOMAIN_IDS) {
    groups.set(id, []);
  }
  for (const item of items) {
    groups.get(item.domain)?.push(item);
  }

  const active = new Map<DomainId, T[]>();
  for (const [id, group] of groups) {
    if (group.length > 0) {
      active.set(id, group);
    }
  }

  const progress = new Map<DomainId, number>();
  for (const id of active.keys()) {
    progress.set(id, 0);
  }

  const result: T[] = [];
  while (result.length < items.length) {
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
    const item = group?.[used];
    if (item === undefined) break;

    result.push(item);
    progress.set(bestId, used + 1);
  }

  return result;
}
