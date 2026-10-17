import { describe, expect, it } from 'vitest';
import type { Review } from '@/domain/card';
import { computeStudyStreak, countReviewsOn } from '@/features/srs/engine/stats';

const NOW = new Date('2026-01-10T12:00:00.000Z');

function reviewOn(day: string, id = day): Review {
  return {
    id,
    cardId: 'card-1',
    reviewedAt: `${day}T09:00:00.000Z`,
    grade: 'good',
    score: 4,
    prevIntervalDays: 1,
    nextIntervalDays: 6,
    prevEaseFactor: 2.5,
    nextEaseFactor: 2.5,
    elapsedDays: 1,
  };
}

describe('computeStudyStreak', () => {
  it('sin repasos no hay racha', () => {
    expect(computeStudyStreak([], NOW)).toEqual({
      current: 0,
      longest: 0,
      lastStudyDate: null,
      studiedToday: false,
    });
  });

  it('un repaso hoy arranca la racha', () => {
    const streak = computeStudyStreak([reviewOn('2026-01-10')], NOW);

    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(1);
    expect(streak.studiedToday).toBe(true);
    expect(streak.lastStudyDate).toBe('2026-01-10');
  });

  it('acumula días consecutivos', () => {
    const streak = computeStudyStreak(
      [reviewOn('2026-01-10'), reviewOn('2026-01-09'), reviewOn('2026-01-08')],
      NOW,
    );

    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
  });

  it('varios repasos del mismo día cuentan como uno', () => {
    const streak = computeStudyStreak(
      [reviewOn('2026-01-10', 'a'), reviewOn('2026-01-10', 'b')],
      NOW,
    );

    expect(streak.current).toBe(1);
  });

  it('la racha no se rompe hasta perder un día completo', () => {
    const streak = computeStudyStreak([reviewOn('2026-01-09'), reviewOn('2026-01-08')], NOW);

    expect(streak.studiedToday).toBe(false);
    expect(streak.current).toBe(2);
  });

  it('un hueco corta la racha pero conserva el récord', () => {
    const streak = computeStudyStreak(
      [
        reviewOn('2026-01-10'),
        reviewOn('2026-01-05'),
        reviewOn('2026-01-04'),
        reviewOn('2026-01-03'),
        reviewOn('2026-01-02'),
      ],
      NOW,
    );

    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(4);
    expect(streak.lastStudyDate).toBe('2026-01-10');
  });
});

describe('countReviewsOn', () => {
  it('cuenta solo los repasos del día indicado', () => {
    const reviews = [
      reviewOn('2026-01-10', 'a'),
      reviewOn('2026-01-10', 'b'),
      reviewOn('2026-01-09', 'c'),
    ];

    expect(countReviewsOn(reviews, NOW)).toBe(2);
  });

  it('devuelve 0 si no hubo actividad', () => {
    expect(countReviewsOn([reviewOn('2026-01-01')], NOW)).toBe(0);
  });
});
