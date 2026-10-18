import { afterEach, describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';
import type { Review } from '@/domain/card';
import { ActivityHeatmap } from '@/features/dashboard/ui/ActivityHeatmap';
import { resetSrsRepository, setSrsRepository } from '@/features/srs/data/repository';
import { makeCard } from '../../helpers/card';
import { createMemoryRepository } from '../../helpers/memoryRepository';
import { renderWithProviders, settleUntil } from '../../helpers/render';

function reviewToday(): Review {
  return {
    id: 'rev-1',
    cardId: 'port-ssh',
    reviewedAt: new Date().toISOString(),
    grade: 'good',
    score: 4,
    prevIntervalDays: 0,
    nextIntervalDays: 1,
    prevEaseFactor: 2.5,
    nextEaseFactor: 2.5,
    elapsedDays: 0,
  };
}

afterEach(() => {
  act(() => {
    resetSrsRepository();
  });
});

describe('ActivityHeatmap', () => {
  it('dibuja 12 semanas con una alternativa textual accesible', async () => {
    setSrsRepository(createMemoryRepository([makeCard({ id: 'port-ssh' })], [reviewToday()]));

    renderWithProviders(<ActivityHeatmap />);
    await settleUntil(() => screen.queryByRole('img') !== null);

    const grid = screen.getByRole('img');
    expect(grid).toHaveAttribute('aria-label', expect.stringMatching(/últimas 12 semanas/i));
    // 12 semanas × 7 días
    expect(grid.children).toHaveLength(84);
    expect(screen.getByRole('heading', { name: 'Tu constancia' })).toBeInTheDocument();
  });

  it('invita a empezar cuando no hay actividad', async () => {
    setSrsRepository(createMemoryRepository([makeCard({ id: 'port-ssh' })]));

    renderWithProviders(<ActivityHeatmap />);
    await settleUntil(() => screen.queryByText(/aún no hay actividad/i) !== null);

    expect(screen.getByText(/aún no hay actividad/i)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/sin actividad/i),
    );
  });
});
