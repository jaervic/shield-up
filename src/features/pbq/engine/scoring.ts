/**
 * Corrección de las PBQ: umbral y cálculo común.
 *
 * Se usa el mismo umbral que en las lecciones (80%): una PBQ no es un examen,
 * es práctica, y el valor está en el intento y en la explicación posterior.
 */

export const PBQ_PASS_THRESHOLD = 0.8;

export function scorePercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function isPassed(score: number): boolean {
  return score >= PBQ_PASS_THRESHOLD * 100;
}
