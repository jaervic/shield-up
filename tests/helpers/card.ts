import type { Card, CardSeed } from '@/domain/card';
import { createCardFromSeed } from '@/features/srs/engine/cardFactory';

export const NOW = new Date('2026-01-01T00:00:00.000Z');

export function makeSeed(overrides: Partial<CardSeed> = {}): CardSeed {
  return {
    id: overrides.id ?? 'port-ssh',
    domain: overrides.domain ?? 3,
    type: overrides.type ?? 'port',
    front: overrides.front ?? '¿Pregunta de prueba?',
    back: overrides.back ?? 'Respuesta de prueba.',
    ...(overrides.hint !== undefined ? { hint: overrides.hint } : {}),
    ...(overrides.tags !== undefined ? { tags: overrides.tags } : {}),
  };
}

export function makeCard(overrides: Partial<Card> = {}, now: Date = NOW): Card {
  const base = createCardFromSeed(makeSeed({ id: overrides.id }), now);
  return { ...base, ...overrides };
}

/** Tarjeta "madura": ya repasada y con un intervalo largo. */
export function makeReviewedCard(overrides: Partial<Card> = {}, now: Date = NOW): Card {
  return makeCard(
    {
      repetitions: 3,
      intervalDays: 30,
      easeFactor: 2.5,
      dueAt: now.toISOString(),
      lastReviewedAt: now.toISOString(),
      ...overrides,
    },
    now,
  );
}
