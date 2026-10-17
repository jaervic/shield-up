/**
 * Fábrica de tarjetas: convierte el contenido seed (JSON validado) en tarjetas
 * listas para el motor, con los valores iniciales de SM-2.
 */

import type { Card, CardSeed } from '@/domain/card';
import { DEFAULT_EASE_FACTOR } from './sm2';

export function createCardFromSeed(seed: CardSeed, now: Date = new Date()): Card {
  const timestamp = now.toISOString();
  const card: Card = {
    id: seed.id,
    domain: seed.domain,
    type: seed.type,
    front: seed.front,
    back: seed.back,
    tags: seed.tags ?? [],
    easeFactor: DEFAULT_EASE_FACTOR,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: timestamp,
    createdAt: timestamp,
    lastReviewedAt: null,
    suspended: false,
  };
  if (seed.hint !== undefined) {
    card.hint = seed.hint;
  }
  return card;
}

export function createCardsFromSeeds(seeds: readonly CardSeed[], now: Date = new Date()): Card[] {
  return seeds.map((seed) => createCardFromSeed(seed, now));
}
