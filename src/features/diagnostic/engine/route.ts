/**
 * Generación de la ruta de estudio personalizada.
 *
 * Idea: la prioridad de un dominio no depende solo de lo mal que se respondió,
 * sino de cuánto pesa en el examen. Así, un 40% de aciertos en Operaciones de
 * Seguridad (28%) genera más urgencia que el mismo 40% en Conceptos Generales
 * (12%): estudiar lo que más puntos aporta.
 */

import type { DomainProficiency, RouteStep, StudyRoute } from '@/domain/diagnostic';
import { DOMAIN_IDS, DOMAIN_WEIGHTS, getDomain, type DomainId } from '@/domain/domain';
import { round2 } from '@/shared/utils/math';

/** Tarjetas sugeridas cuando el hueco de conocimiento es total. */
export const CARDS_PER_GAP_UNIT = 30;

function describeReason(domain: DomainId, entry: DomainProficiency, gap: number): string {
  const name = getDomain(domain).nameEs;

  if (!entry.evaluated) {
    return `${name}: sin evaluar en el diagnóstico; se asume hueco completo.`;
  }

  const percent = Math.round(entry.accuracy * 100);

  if (gap >= 0.5) {
    return `${name}: solo ${percent}% de aciertos. Base débil, conviene empezar por aquí.`;
  }
  if (gap >= 0.25) {
    return `${name}: ${percent}% de aciertos. Necesita refuerzo antes del examen.`;
  }
  return `${name}: ${percent}% de aciertos. Mantenimiento con repaso ligero.`;
}

export function buildStudyRoute(
  proficiency: Readonly<Record<DomainId, DomainProficiency>>,
  now: Date = new Date(),
  weights: Readonly<Record<DomainId, number>> = DOMAIN_WEIGHTS,
): StudyRoute {
  const steps: RouteStep[] = DOMAIN_IDS.map((domain) => {
    const entry = proficiency[domain];
    const gap = entry.evaluated ? 1 - entry.accuracy : 1;

    return {
      domain,
      gap: round2(gap),
      priority: round2(weights[domain] * gap),
      reason: describeReason(domain, entry, gap),
      estimatedCards: Math.round(gap * CARDS_PER_GAP_UNIT),
    };
  }).sort((a, b) => b.priority - a.priority || a.domain - b.domain);

  return {
    generatedAt: now.toISOString(),
    steps,
    focusDomain: steps[0]?.domain ?? 1,
  };
}
