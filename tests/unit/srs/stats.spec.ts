import { describe, expect, it } from 'vitest';
import type { Review } from '@/domain/card';
import { addDays } from '@/shared/utils/date';
import { computeStats, projectReviewLoad } from '@/features/srs/engine/stats';
import { NOW, makeCard, makeReviewedCard } from '../../helpers/card';

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: overrides.id ?? 'rev-1',
    cardId: overrides.cardId ?? 'port-ssh',
    reviewedAt: overrides.reviewedAt ?? NOW.toISOString(),
    grade: overrides.grade ?? 'good',
    score: overrides.score ?? 4,
    prevIntervalDays: 1,
    nextIntervalDays: 6,
    prevEaseFactor: 2.5,
    nextEaseFactor: 2.5,
    elapsedDays: 1,
  };
}

describe('computeStats', () => {
  it('clasifica nuevas, jóvenes y maduras', () => {
    const cards = [
      makeCard({ id: 'new' }),
      makeReviewedCard({ id: 'young', intervalDays: 5 }),
      makeReviewedCard({ id: 'mature', intervalDays: 30 }),
    ];

    const stats = computeStats(cards, [], NOW);

    expect(stats.total).toBe(3);
    expect(stats.newCards).toBe(1);
    expect(stats.young).toBe(1);
    expect(stats.mature).toBe(1);
  });

  it('cuenta como pendientes solo las repasadas ya vencidas', () => {
    const cards = [
      makeReviewedCard({ id: 'due', dueAt: addDays(NOW, -1).toISOString() }),
      makeReviewedCard({ id: 'future', dueAt: addDays(NOW, 3).toISOString() }),
      makeCard({ id: 'new' }),
    ];

    const stats = computeStats(cards, [], NOW);

    expect(stats.dueToday).toBe(1);
  });

  it('excluye las suspendidas del recuento de pendientes', () => {
    const cards = [
      makeReviewedCard({ id: 'suspended', suspended: true, dueAt: addDays(NOW, -1).toISOString() }),
    ];

    const stats = computeStats(cards, [], NOW);

    expect(stats.dueToday).toBe(0);
    expect(stats.suspended).toBe(1);
  });

  it('devuelve retención null sin repasos y calculada con ellos', () => {
    const cards = [makeReviewedCard({ id: 'c1' })];
    const reviews = [
      makeReview({ id: 'r1', score: 4 }),
      makeReview({ id: 'r2', score: 5 }),
      makeReview({ id: 'r3', grade: 'again', score: 0 }),
      makeReview({ id: 'r4', score: 3 }),
    ];

    expect(computeStats(cards, [], NOW).retentionRate).toBeNull();
    expect(computeStats(cards, reviews, NOW).retentionRate).toBeCloseTo(0.75, 5);
  });

  it('agrupa por dominio y calcula el EF medio', () => {
    const cards = [
      makeCard({ id: 'd1', domain: 1, easeFactor: 2.0 }),
      makeCard({ id: 'd2', domain: 1, easeFactor: 3.0 }),
      makeCard({ id: 'd3', domain: 5 }),
    ];

    const stats = computeStats(cards, [], NOW);

    expect(stats.byDomain[1].total).toBe(2);
    expect(stats.byDomain[1].avgEaseFactor).toBe(2.5);
    expect(stats.byDomain[5].total).toBe(1);
    expect(stats.byDomain[2].total).toBe(0);
  });

  it('acumula lapses totales', () => {
    const cards = [
      makeCard({ id: 'a', lapses: 2 }),
      makeCard({ id: 'b', lapses: 3 }),
    ];

    expect(computeStats(cards, [], NOW).totalLapses).toBe(5);
  });
});

describe('projectReviewLoad', () => {
  it('devuelve un punto por día y acumula las vencidas pasadas en el primer día', () => {
    const cards = [
      makeReviewedCard({ id: 'overdue', dueAt: addDays(NOW, -10).toISOString() }),
      makeReviewedCard({ id: 'in2', dueAt: addDays(NOW, 2).toISOString() }),
    ];

    const load = projectReviewLoad(cards, NOW, 14);

    expect(load).toHaveLength(14);
    expect(load[0]?.count).toBe(1);
    expect(load[2]?.count).toBe(1);
  });
});
