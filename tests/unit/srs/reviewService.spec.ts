import { afterEach, describe, expect, it } from 'vitest';
import { reviewCard } from '@/features/srs/data/reviewService';
import { resetSrsRepository, setSrsRepository } from '@/features/srs/data/repository';
import { ensureContentSeeded } from '@/features/srs/data/seedService';
import { NOW, makeCard } from '../../helpers/card';
import { createMemoryRepository } from '../../helpers/memoryRepository';

afterEach(() => {
  resetSrsRepository();
});

describe('reviewCard', () => {
  it('programa la tarjeta y registra el repaso', async () => {
    const repository = createMemoryRepository([makeCard({ id: 'port-ssh' })]);
    setSrsRepository(repository);

    const { card, review } = await reviewCard('port-ssh', 'good', NOW);

    expect(card.repetitions).toBe(1);
    expect(card.intervalDays).toBe(1);
    expect(review.grade).toBe('good');
    expect(review.score).toBe(4);

    // Persistencia efectiva
    expect(repository.cards).toHaveLength(1);
    expect(repository.cards[0]?.repetitions).toBe(1);
    expect(repository.reviews).toHaveLength(1);
  });

  it('lanza un error si la tarjeta no existe', async () => {
    setSrsRepository(createMemoryRepository());

    await expect(reviewCard('no-existe', 'good', NOW)).rejects.toThrow(/no existe/i);
  });
});

describe('ensureContentSeeded', () => {
  it('inserta el contenido la primera vez y no lo duplica después', async () => {
    const repository = createMemoryRepository();
    setSrsRepository(repository);

    const first = await ensureContentSeeded(NOW);
    expect(first.seeded).toBe(true);
    expect(first.cardCount).toBeGreaterThanOrEqual(30);

    const second = await ensureContentSeeded(NOW);
    expect(second.seeded).toBe(false);
    expect(second.cardCount).toBe(first.cardCount);
    expect(repository.cards).toHaveLength(first.cardCount);
  });
});
