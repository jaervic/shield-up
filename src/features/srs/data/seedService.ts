/**
 * Seed del contenido: la primera vez que se abre la app, el contenido de
 * /content/flashcards se inserta en IndexedDB. En ejecuciones posteriores se
 * respeta el progreso del usuario.
 */

import { loadCardSeeds } from '@/data/content/loadContent';
import { createCardsFromSeeds } from '../engine/cardFactory';
import { getSrsRepository } from './repository';

export interface SeedResult {
  seeded: boolean;
  cardCount: number;
}

export async function ensureContentSeeded(now: Date = new Date()): Promise<SeedResult> {
  const repository = getSrsRepository();
  const existing = await repository.countCards();

  if (existing > 0) {
    return { seeded: false, cardCount: existing };
  }

  const cards = createCardsFromSeeds(loadCardSeeds(), now);
  await repository.saveCards(cards);

  return { seeded: true, cardCount: cards.length };
}
