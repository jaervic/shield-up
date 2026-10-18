import type { Card, Review } from '@/domain/card';

export function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    domain: 3,
    type: 'port',
    front: '¿Pregunta?',
    back: 'Respuesta.',
    tags: [],
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: '2026-03-01T10:00:00.000Z',
    createdAt: '2026-03-01T10:00:00.000Z',
    lastReviewedAt: null,
    suspended: false,
    ...overrides,
  };
}

export function makeReview(id: string, overrides: Partial<Review> = {}): Review {
  return {
    id,
    cardId: 'port-ssh',
    reviewedAt: '2026-03-01T10:00:00.000Z',
    grade: 'good',
    score: 4,
    prevIntervalDays: 0,
    nextIntervalDays: 1,
    prevEaseFactor: 2.5,
    nextEaseFactor: 2.5,
    elapsedDays: 0,
    ...overrides,
  };
}
