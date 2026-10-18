import { describe, expect, it } from 'vitest';
import type { Confidence, Review } from '@/domain/card';
import {
  MIN_DECLARED_FOR_INSIGHT,
  computeCalibration,
} from '@/features/srs/engine/calibration';

function review(confidence: Confidence | undefined, correct: boolean, id = 'rev'): Review {
  const base: Review = {
    id,
    cardId: 'card-1',
    reviewedAt: '2026-03-01T10:00:00.000Z',
    grade: correct ? 'good' : 'again',
    score: correct ? 4 : 0,
    prevIntervalDays: 0,
    nextIntervalDays: 1,
    prevEaseFactor: 2.5,
    nextEaseFactor: 2.5,
    elapsedDays: 0,
  };
  return confidence === undefined ? base : { ...base, confidence };
}

describe('computeCalibration', () => {
  it('sin repasos declarados no hay datos ni conclusión', () => {
    const calibration = computeCalibration([review(undefined, true), review(undefined, false)]);

    expect(calibration.declared).toBe(0);
    expect(calibration.sure.total).toBe(0);
    expect(calibration.unsure.total).toBe(0);
    expect(calibration.insight).toBe('');
  });

  it('separa los repasos por confianza declarada', () => {
    const calibration = computeCalibration([
      review('sure', true, 'a'),
      review('sure', true, 'b'),
      review('unsure', false, 'c'),
      review(undefined, true, 'd'),
    ]);

    expect(calibration.declared).toBe(3);
    expect(calibration.sure).toMatchObject({ total: 2, correct: 2, accuracy: 1 });
    expect(calibration.unsure).toMatchObject({ total: 1, correct: 0, accuracy: 0 });
  });

  it('no concluye nada por debajo del mínimo de repasos declarados', () => {
    const reviews = Array.from({ length: MIN_DECLARED_FOR_INSIGHT - 1 }, (_, index) =>
      review('sure', false, `r${index}`),
    );

    expect(computeCalibration(reviews).insight).toBe('');
  });

  it('detecta el exceso de confianza: crees saberlo y fallas', () => {
    const reviews = [
      review('sure', false, 'a'),
      review('sure', false, 'b'),
      review('sure', true, 'c'),
      review('sure', false, 'd'),
      review('sure', true, 'e'),
    ];

    const calibration = computeCalibration(reviews);

    expect(calibration.sure.accuracy).toBeCloseTo(0.4, 5);
    expect(calibration.insight).toMatch(/crees dominar algo que todavía no/i);
  });

  it('detecta la infravaloración: dudas y aciertas', () => {
    const reviews = [
      review('unsure', true, 'a'),
      review('unsure', true, 'b'),
      review('unsure', true, 'c'),
      review('unsure', false, 'd'),
      review('unsure', true, 'e'),
    ];

    expect(computeCalibration(reviews).insight).toMatch(/fiarte/i);
  });

  it('reconoce una confianza bien calibrada', () => {
    const reviews = [
      review('sure', true, 'a'),
      review('sure', true, 'b'),
      review('sure', true, 'c'),
      review('sure', true, 'd'),
      review('sure', true, 'e'),
      review('sure', true, 'f'),
      review('sure', false, 'g'),
    ];

    const calibration = computeCalibration(reviews);

    // 6 de 7 aciertos declarando seguridad: por encima del umbral de buena calibración.
    expect(calibration.sure.accuracy).toBeCloseTo(0.86, 2);
    expect(calibration.insight).toMatch(/bien calibrada/i);
  });
});
