/**
 * Contrato de persistencia del SRS.
 *
 * La app depende de esta interfaz, no de Dexie. Añadir sincronización
 * (Supabase/Postgres) consiste en implementar otro repositorio y registrarlo
 * con `setSrsRepository`, sin tocar store ni UI.
 */

import type { Card, Review } from '@/domain/card';

export interface SrsRepository {
  getCards(): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  saveCard(card: Card): Promise<void>;
  saveCards(cards: readonly Card[]): Promise<void>;
  logReview(review: Review): Promise<void>;
  getReviews(): Promise<Review[]>;
  getReviewsForCard(cardId: string): Promise<Review[]>;
  /** Número de tarjetas almacenadas (se usa para el seed inicial). */
  countCards(): Promise<number>;
  /** Borra todo (útil en tests y en "reiniciar progreso"). */
  clear(): Promise<void>;
}
