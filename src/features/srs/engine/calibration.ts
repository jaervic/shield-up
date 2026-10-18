/**
 * Calibración de la confianza.
 *
 * Módulo PURO. Cruza lo que el usuario CREÍA saber antes de revelar con lo que
 * realmente acertó. Es la métrica que más enseña: la "ilusión de saber" (creer
 * dominar algo que aún no se domina) es el error de estudio más común y este
 * cálculo lo hace visible.
 */

import type { Review } from '@/domain/card';

export interface CalibrationBucket {
  /** Repasos con esa confianza declarada. */
  total: number;
  /** De ellos, cuántos se acertaron (score >= 3). */
  correct: number;
  /** 0..1. Vale 0 si no hay datos. */
  accuracy: number;
}

export interface Calibration {
  sure: CalibrationBucket;
  unsure: CalibrationBucket;
  /** Total de repasos con confianza declarada. */
  declared: number;
  /** Lectura cualitativa de los datos; cadena vacía si no hay datos suficientes. */
  insight: string;
}

/** Por debajo de este número de repasos declarados no se saca conclusión. */
export const MIN_DECLARED_FOR_INSIGHT = 5;

function bucket(reviews: readonly Review[]): CalibrationBucket {
  const total = reviews.length;
  const correct = reviews.filter((review) => review.score >= 3).length;
  return { total, correct, accuracy: total > 0 ? correct / total : 0 };
}

export function computeCalibration(reviews: readonly Review[]): Calibration {
  const declared = reviews.filter((review) => review.confidence !== undefined);
  const sure = bucket(declared.filter((review) => review.confidence === 'sure'));
  const unsure = bucket(declared.filter((review) => review.confidence === 'unsure'));

  return {
    sure,
    unsure,
    declared: declared.length,
    insight: buildInsight(sure, unsure, declared.length),
  };
}

function buildInsight(
  sure: CalibrationBucket,
  unsure: CalibrationBucket,
  declared: number,
): string {
  if (declared < MIN_DECLARED_FOR_INSIGHT) return '';

  if (sure.total >= 3 && sure.accuracy < 0.7) {
    return 'Cuidado: a veces crees dominar algo que todavía no resiste el olvido. Ese exceso de confianza es la señal más útil que da este test.';
  }
  if (unsure.total >= 3 && unsure.accuracy >= 0.7) {
    return 'Dudas más de lo que deberías: aciertas la mayoría de lo que marcas como inseguro. Empieza a fiarte.';
  }
  if (sure.accuracy >= 0.85 && sure.total >= 3) {
    return 'Tu confianza está bien calibrada: cuando dices que lo sabes, lo sabes.';
  }
  return 'Registrar tu confianza antes de revelar está afinando tu capacidad de saber lo que sabes.';
}
