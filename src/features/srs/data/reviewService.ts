/**
 * Servicio de aplicación del SRS: orquesta motor + persistencia.
 *
 * Es el único punto donde se combinan cálculo (engine) y almacenamiento
 * (repository), de modo que el store de Zustand no contiene reglas de negocio.
 */

import type { Card, Confidence, Grade, Review } from '@/domain/card';
import { getScheduler, createReviewRecord } from '../engine/scheduler';
import { getSrsRepository } from './repository';

export interface ReviewOutcome {
  card: Card;
  review: Review;
}

/**
 * Programa y persiste un repaso. Devuelve la tarjeta actualizada y el log.
 * `confidence` es opcional: solo se registra si el usuario la declaró.
 */
export async function reviewCard(
  cardId: string,
  grade: Grade,
  now: Date = new Date(),
  confidence?: Confidence,
): Promise<ReviewOutcome> {
  const repository = getSrsRepository();
  const card = await repository.getCard(cardId);

  if (!card) {
    throw new Error(`No existe la tarjeta "${cardId}".`);
  }

  const scheduler = getScheduler();
  const updated = scheduler.schedule(card, grade, now);
  const review = createReviewRecord(card, updated, grade, now, confidence);

  await repository.saveCard(updated);
  await repository.logReview(review);

  return { card: updated, review };
}
