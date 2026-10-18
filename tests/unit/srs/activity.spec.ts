import { describe, expect, it } from 'vitest';
import type { Review } from '@/domain/card';
import { addDays, toDateKey } from '@/shared/utils/date';
import {
  ACTIVITY_THRESHOLDS,
  activityLevel,
  computeActivityHeatmap,
} from '@/features/srs/engine/activity';

const NOW = new Date('2026-03-15T18:00:00.000Z');

function reviewsOn(date: Date, count: number): Review[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `rev-${toDateKey(date)}-${index}`,
    cardId: 'card-1',
    reviewedAt: new Date(`${toDateKey(date)}T10:00:00.000Z`).toISOString(),
    grade: 'good' as const,
    score: 4,
    prevIntervalDays: 1,
    nextIntervalDays: 6,
    prevEaseFactor: 2.5,
    nextEaseFactor: 2.5,
    elapsedDays: 1,
  }));
}

describe('activityLevel', () => {
  it('asigna 0 a los días sin repasos', () => {
    expect(activityLevel(0)).toBe(0);
  });

  it('sube de nivel al cruzar cada umbral', () => {
    expect(activityLevel(ACTIVITY_THRESHOLDS[0])).toBe(1);
    expect(activityLevel(ACTIVITY_THRESHOLDS[1])).toBe(2);
    expect(activityLevel(ACTIVITY_THRESHOLDS[2])).toBe(3);
    expect(activityLevel(ACTIVITY_THRESHOLDS[3])).toBe(4);
  });

  it('se queda en el nivel anterior justo por debajo del umbral', () => {
    expect(activityLevel(ACTIVITY_THRESHOLDS[1] - 1)).toBe(1);
    expect(activityLevel(ACTIVITY_THRESHOLDS[2] - 1)).toBe(2);
    expect(activityLevel(ACTIVITY_THRESHOLDS[3] - 1)).toBe(3);
  });

  it('nunca pasa de 4', () => {
    expect(activityLevel(9999)).toBe(4);
  });
});

describe('computeActivityHeatmap', () => {
  it('genera exactamente semanas × 7 días y termina hoy', () => {
    const heatmap = computeActivityHeatmap([], NOW, 12);

    expect(heatmap.days).toHaveLength(84);
    expect(heatmap.days[0]?.date).toBe(toDateKey(addDays(NOW, -83)));
    expect(heatmap.days[83]?.date).toBe(toDateKey(NOW));
  });

  it('sin repasos, todo a cero y con resumen explícito', () => {
    const heatmap = computeActivityHeatmap([], NOW, 12);

    expect(heatmap.activeDays).toBe(0);
    expect(heatmap.totalReviews).toBe(0);
    expect(heatmap.maxCount).toBe(0);
    expect(heatmap.busiestDate).toBeNull();
    expect(heatmap.days.every((day) => day.level === 0)).toBe(true);
    expect(heatmap.summary).toMatch(/sin actividad/i);
  });

  it('cuenta los repasos del día y calcula el nivel', () => {
    const heatmap = computeActivityHeatmap(
      [...reviewsOn(NOW, 3), ...reviewsOn(addDays(NOW, -1), 12)],
      NOW,
      12,
    );

    const today = heatmap.days[83];
    const yesterday = heatmap.days[82];

    expect(today).toMatchObject({ count: 3, level: 1 });
    expect(yesterday).toMatchObject({ count: 12, level: 3 });
    expect(heatmap.activeDays).toBe(2);
    expect(heatmap.totalReviews).toBe(15);
  });

  it('identifica el día más activo', () => {
    const heatmap = computeActivityHeatmap(
      [...reviewsOn(NOW, 2), ...reviewsOn(addDays(NOW, -3), 25)],
      NOW,
      12,
    );

    expect(heatmap.maxCount).toBe(25);
    expect(heatmap.busiestDate).toBe(toDateKey(addDays(NOW, -3)));
  });

  it('ignora los repasos anteriores a la ventana', () => {
    const heatmap = computeActivityHeatmap(reviewsOn(addDays(NOW, -100), 5), NOW, 12);

    expect(heatmap.totalReviews).toBe(0);
  });

  it('respeta el número de semanas solicitado', () => {
    expect(computeActivityHeatmap([], NOW, 4).days).toHaveLength(28);
    expect(computeActivityHeatmap([], NOW, 1).days).toHaveLength(7);
  });

  it('el resumen incluye el dato que aporta el color', () => {
    const heatmap = computeActivityHeatmap([...reviewsOn(NOW, 4)], NOW, 12);

    expect(heatmap.summary).toMatch(/1 de 84 días/);
    expect(heatmap.summary).toMatch(/4 repasos/);
  });
});
