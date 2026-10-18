import { describe, expect, it } from 'vitest';
import type { Card } from '@/domain/card';
import { addDays } from '@/shared/utils/date';
import { buildDailyQueue, summarizeQueue } from '@/features/srs/engine/queue';
import { NOW, makeCard, makeReviewedCard } from '../../helpers/card';

function dueCard(id: string, domain: Card['domain']): Card {
  return makeReviewedCard({ id, domain, dueAt: addDays(NOW, -1).toISOString() });
}

describe('summarizeQueue', () => {
  it('resume una cola vacía sin estimar duración', () => {
    const plan = summarizeQueue(buildDailyQueue([], NOW));

    expect(plan).toMatchObject({
      cardCount: 0,
      dueCount: 0,
      newCount: 0,
      estimatedMinutes: 0,
      domains: [],
    });
  });

  it('cuenta vencidas y nuevas por separado', () => {
    const queue = buildDailyQueue(
      [dueCard('d4-1', 4), dueCard('d4-2', 4), makeCard({ id: 'new-1', domain: 1 })],
      NOW,
      { newLimit: 10 },
    );

    const plan = summarizeQueue(queue);

    expect(plan.cardCount).toBe(3);
    expect(plan.dueCount).toBe(2);
    expect(plan.newCount).toBe(1);
  });

  it('estima la duración a partir de un ritmo medio por tarjeta', () => {
    const cards = Array.from({ length: 21 }, (_, index) => makeCard({ id: `n-${index}` }));

    // 21 tarjetas × 20 s = 420 s = 7 min
    expect(summarizeQueue(buildDailyQueue(cards, NOW, { newLimit: 21 })).estimatedMinutes).toBe(7);
  });

  it('nunca estima menos de un minuto si hay tarjetas', () => {
    const plan = summarizeQueue(buildDailyQueue([makeCard({ id: 'one' })], NOW, { newLimit: 1 }));

    expect(plan.cardCount).toBe(1);
    expect(plan.estimatedMinutes).toBe(1);
  });

  it('reparte los dominios de mayor a menor', () => {
    const queue = buildDailyQueue(
      [
        makeCard({ id: 'd4-a', domain: 4 }),
        makeCard({ id: 'd4-b', domain: 4 }),
        makeCard({ id: 'd4-c', domain: 4 }),
        makeCard({ id: 'd1-a', domain: 1 }),
      ],
      NOW,
      { newLimit: 10 },
    );

    const plan = summarizeQueue(queue);

    expect(plan.domains[0]).toEqual({ domain: 4, count: 3 });
    expect(plan.domains[1]).toEqual({ domain: 1, count: 1 });
    // La suma del reparto coincide con el total de la cola.
    expect(plan.domains.reduce((sum, entry) => sum + entry.count, 0)).toBe(plan.cardCount);
  });

  it('la práctica dirigida limita la cola a los dominios elegidos', () => {
    const cards = [
      makeCard({ id: 'd4-a', domain: 4 }),
      makeCard({ id: 'd4-b', domain: 4 }),
      makeCard({ id: 'd1-a', domain: 1 }),
      makeCard({ id: 'd2-a', domain: 2 }),
    ];

    const plan = summarizeQueue(buildDailyQueue(cards, NOW, { newLimit: 10, onlyDomains: [4] }));

    expect(plan.cardCount).toBe(2);
    expect(plan.domains).toEqual([{ domain: 4, count: 2 }]);
  });

  it('acepta varios dominios en la práctica dirigida', () => {
    const cards = [
      makeCard({ id: 'd4-a', domain: 4 }),
      makeCard({ id: 'd1-a', domain: 1 }),
      makeCard({ id: 'd2-a', domain: 2 }),
    ];

    const plan = summarizeQueue(
      buildDailyQueue(cards, NOW, { newLimit: 10, onlyDomains: [4, 2] }),
    );

    expect(plan.cardCount).toBe(2);
    expect(plan.domains.map((entry) => entry.domain).sort()).toEqual([2, 4]);
  });

  it('un filtro vacío equivale a la sesión completa', () => {
    const cards = [makeCard({ id: 'a', domain: 4 }), makeCard({ id: 'b', domain: 1 })];

    const withEmpty = summarizeQueue(buildDailyQueue(cards, NOW, { newLimit: 10, onlyDomains: [] }));
    const withoutFilter = summarizeQueue(buildDailyQueue(cards, NOW, { newLimit: 10 }));

    expect(withEmpty).toEqual(withoutFilter);
  });

  it('la práctica dirigida también respeta las tarjetas suspendidas', () => {
    const cards = [
      makeCard({ id: 'ok', domain: 4 }),
      makeCard({ id: 'off', domain: 4, suspended: true }),
    ];

    const plan = summarizeQueue(buildDailyQueue(cards, NOW, { newLimit: 10, onlyDomains: [4] }));

    expect(plan.cardCount).toBe(1);
  });
});
