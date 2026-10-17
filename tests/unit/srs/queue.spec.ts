import { describe, expect, it } from 'vitest';
import type { Card } from '@/domain/card';
import { DOMAIN_WEIGHTS } from '@/domain/domain';
import { addDays } from '@/shared/utils/date';
import {
  buildDailyQueue,
  createRng,
  interleaveByDomain,
  shuffle,
} from '@/features/srs/engine/queue';
import { NOW, makeCard, makeReviewedCard } from '../../helpers/card';

function dueCard(id: string, domain: Card['domain'], dueDaysAgo: number): Card {
  return makeReviewedCard({ id, domain, dueAt: addDays(NOW, -dueDaysAgo).toISOString() });
}

describe('createRng / shuffle', () => {
  it('es determinista para la misma semilla', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('shuffle no muta la entrada y conserva los elementos', () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffle(input, createRng(7));

    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...output].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('interleaveByDomain', () => {
  it('reparte en proporción a los pesos, sin agrupar por dominio', () => {
    const cards = [
      ...Array.from({ length: 4 }, (_, i) => makeCard({ id: `d4-${i}`, domain: 4 })),
      ...Array.from({ length: 4 }, (_, i) => makeCard({ id: `d2-${i}`, domain: 2 })),
    ];

    const result = interleaveByDomain(cards, DOMAIN_WEIGHTS);

    expect(result).toHaveLength(8);
    // El primer tercio debe contener ambos dominios (interleaving real).
    const firstThree = result.slice(0, 3).map((card) => card.domain);
    expect(new Set(firstThree).size).toBeGreaterThan(1);
  });

  it('preserva el orden interno de cada dominio', () => {
    const cards = [
      makeCard({ id: 'd3-a', domain: 3 }),
      makeCard({ id: 'd3-b', domain: 3 }),
      makeCard({ id: 'd1-a', domain: 1 }),
      makeCard({ id: 'd1-b', domain: 1 }),
    ];

    const result = interleaveByDomain(cards, DOMAIN_WEIGHTS);
    const d3 = result.filter((card) => card.domain === 3).map((card) => card.id);
    const d1 = result.filter((card) => card.domain === 1).map((card) => card.id);

    expect(d3).toEqual(['d3-a', 'd3-b']);
    expect(d1).toEqual(['d1-a', 'd1-b']);
  });
});

describe('buildDailyQueue', () => {
  it('solo incluye como vencidas las tarjetas repasadas con dueAt pasado', () => {
    const cards = [
      dueCard('due-1', 4, 2),
      makeReviewedCard({ id: 'future', dueAt: addDays(NOW, 5).toISOString() }),
      makeCard({ id: 'new-1' }),
    ];

    const queue = buildDailyQueue(cards, NOW, { newLimit: 10 });

    expect(queue.dueCount).toBe(1);
    expect(queue.cards.map((card) => card.id)).toContain('due-1');
    expect(queue.cards.map((card) => card.id)).not.toContain('future');
  });

  it('respeta el límite de tarjetas nuevas', () => {
    const cards = Array.from({ length: 50 }, (_, i) => makeCard({ id: `new-${i}` }));

    const queue = buildDailyQueue(cards, NOW, { newLimit: 20 });

    expect(queue.newCount).toBe(20);
    expect(queue.cards).toHaveLength(20);
    expect(queue.availableCount).toBe(50);
  });

  it('excluye tarjetas suspendidas', () => {
    const cards = [
      makeCard({ id: 'suspended', suspended: true }),
      makeCard({ id: 'active' }),
    ];

    const queue = buildDailyQueue(cards, NOW, { newLimit: 10 });

    expect(queue.cards.map((card) => card.id)).toEqual(['active']);
  });

  it('prioriza las tarjetas vencidas más antiguas dentro del mismo dominio', () => {
    const cards = [
      dueCard('recent', 4, 1),
      dueCard('older', 4, 10),
      dueCard('oldest', 4, 30),
    ];

    const queue = buildDailyQueue(cards, NOW, { newLimit: 0 });

    expect(queue.cards.map((card) => card.id)).toEqual(['oldest', 'older', 'recent']);
  });

  it('es determinista con la misma semilla', () => {
    const cards = Array.from({ length: 30 }, (_, i) =>
      makeCard({ id: `n-${i}`, domain: ((i % 5) + 1) as Card['domain'] }),
    );

    const a = buildDailyQueue(cards, NOW, { newLimit: 10, seed: 99 });
    const b = buildDailyQueue(cards, NOW, { newLimit: 10, seed: 99 });
    const c = buildDailyQueue(cards, NOW, { newLimit: 10, seed: 100 });

    expect(a.cards.map((card) => card.id)).toEqual(b.cards.map((card) => card.id));
    expect(a.cards.map((card) => card.id)).not.toEqual(c.cards.map((card) => card.id));
  });
});
