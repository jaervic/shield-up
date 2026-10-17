import { describe, expect, it } from 'vitest';
import { addDays } from '@/shared/utils/date';
import {
  DEFAULT_EASE_FACTOR,
  MAX_EASE_FACTOR,
  MAX_INTERVAL_DAYS,
  MIN_EASE_FACTOR,
  calculateEaseFactor,
  schedule,
} from '@/features/srs/engine/sm2';
import { NOW, makeCard } from '../../helpers/card';

describe('calculateEaseFactor', () => {
  it('mantiene el factor con "Bien" (q=4)', () => {
    expect(calculateEaseFactor(DEFAULT_EASE_FACTOR, 4)).toBeCloseTo(2.5, 5);
  });

  it('sube el factor con "Fácil" (q=5)', () => {
    expect(calculateEaseFactor(DEFAULT_EASE_FACTOR, 5)).toBeCloseTo(2.6, 5);
  });

  it('baja el factor con "Difícil" (q=3)', () => {
    expect(calculateEaseFactor(DEFAULT_EASE_FACTOR, 3)).toBeCloseTo(2.36, 5);
  });

  it('nunca baja de MIN_EASE_FACTOR aunque se falle muchas veces', () => {
    let factor = DEFAULT_EASE_FACTOR;
    for (let i = 0; i < 20; i += 1) {
      factor = calculateEaseFactor(factor, 0);
    }
    expect(factor).toBe(MIN_EASE_FACTOR);
  });

  it('nunca supera MAX_EASE_FACTOR', () => {
    let factor = DEFAULT_EASE_FACTOR;
    for (let i = 0; i < 20; i += 1) {
      factor = calculateEaseFactor(factor, 5);
    }
    expect(factor).toBe(MAX_EASE_FACTOR);
  });
});

describe('schedule', () => {
  it('es puro: no muta la tarjeta original', () => {
    const card = makeCard();
    const snapshot = structuredClone(card);

    schedule(card, 'good', NOW);

    expect(card).toEqual(snapshot);
  });

  it('primera respuesta correcta: 1 día, repetitions=1', () => {
    const next = schedule(makeCard(), 'good', NOW);

    expect(next.intervalDays).toBe(1);
    expect(next.repetitions).toBe(1);
    expect(next.lapses).toBe(0);
    expect(next.dueAt).toBe(addDays(NOW, 1).toISOString());
    expect(next.lastReviewedAt).toBe(NOW.toISOString());
  });

  it('segunda respuesta correcta: 6 días, repetitions=2', () => {
    const first = schedule(makeCard(), 'good', NOW);
    const second = schedule(first, 'good', NOW);

    expect(second.intervalDays).toBe(6);
    expect(second.repetitions).toBe(2);
  });

  it('secuencia de aciertos con EF 2.5 produce 1, 6, 15, 38 días', () => {
    let card = makeCard();
    const intervals: number[] = [];

    for (let i = 0; i < 4; i += 1) {
      card = schedule(card, 'good', NOW);
      intervals.push(card.intervalDays);
    }

    expect(intervals).toEqual([1, 6, 15, 38]);
  });

  it('un fallo reinicia repetitions, sube lapses y penaliza el factor', () => {
    const studied = schedule(schedule(makeCard(), 'good', NOW), 'good', NOW);
    const failed = schedule(studied, 'again', NOW);

    expect(failed.repetitions).toBe(0);
    expect(failed.lapses).toBe(1);
    expect(failed.intervalDays).toBe(1);
    expect(failed.easeFactor).toBeCloseTo(2.3, 5);
  });

  it('"Difícil" da un intervalo menor que "Bien"', () => {
    const studied = schedule(schedule(makeCard(), 'good', NOW), 'good', NOW);
    const hard = schedule(studied, 'hard', NOW);
    const good = schedule(studied, 'good', NOW);

    expect(hard.intervalDays).toBeLessThan(good.intervalDays);
    expect(hard.intervalDays).toBe(11);
  });

  it('"Fácil" da un intervalo mayor que "Bien"', () => {
    const studied = schedule(schedule(makeCard(), 'good', NOW), 'good', NOW);
    const easy = schedule(studied, 'easy', NOW);
    const good = schedule(studied, 'good', NOW);

    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
  });

  it('acota el intervalo a MAX_INTERVAL_DAYS', () => {
    const mature = makeCard({ repetitions: 10, intervalDays: MAX_INTERVAL_DAYS, easeFactor: 2.5 });
    const next = schedule(mature, 'easy', NOW);

    expect(next.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it('el factor de facilidad nunca queda por debajo del mínimo tras fallar', () => {
    let card = makeCard();
    for (let i = 0; i < 10; i += 1) {
      card = schedule(card, 'again', NOW);
    }

    expect(card.easeFactor).toBe(MIN_EASE_FACTOR);
    expect(card.lapses).toBe(10);
  });
});
