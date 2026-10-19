/**
 * Seed del contenido: al abrir la app, asegura que TODAS las tarjetas de
 * /content/flashcards existen en IndexedDB. En el primer arranque inserta el
 * mazo completo; en los siguientes solo añade las tarjetas nuevas del contenido
 * (por ejemplo, al ampliar el banco), sin tocar el progreso de las existentes.
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
  const existing = await repository.getCards();
  const existingIds = new Set(existing.map((card) => card.id));

  const missing = loadCardSeeds().filter((seed) => !existingIds.has(seed.id));

  if (missing.length === 0) {
    return { seeded: false, cardCount: existing.length };
  }

  await repository.saveCards(createCardsFromSeeds(missing, now));

  return { seeded: true, cardCount: existing.length + missing.length };
}
