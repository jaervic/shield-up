import type { Card, Review } from '@/domain/card';
import type { SrsRepository } from '@/features/srs/data/srsRepository';

export interface MemoryRepository extends SrsRepository {
  cards: Card[];
  reviews: Review[];
}

/** Repositorio en memoria para tests: misma interfaz, sin IndexedDB. */
export function createMemoryRepository(initialCards: Card[] = []): MemoryRepository {
  const cards = [...initialCards];
  const reviews: Review[] = [];

  return {
    cards,
    reviews,

    async getCards() {
      return [...cards];
    },

    async getCard(id) {
      return cards.find((card) => card.id === id);
    },

    async saveCard(card) {
      const index = cards.findIndex((existing) => existing.id === card.id);
      if (index >= 0) {
        cards[index] = card;
      } else {
        cards.push(card);
      }
    },

    async saveCards(newCards) {
      for (const card of newCards) {
        const index = cards.findIndex((existing) => existing.id === card.id);
        if (index >= 0) {
          cards[index] = card;
        } else {
          cards.push(card);
        }
      }
    },

    async logReview(review) {
      reviews.push(review);
    },

    async getReviews() {
      return [...reviews];
    },

    async getReviewsForCard(cardId) {
      return reviews.filter((review) => review.cardId === cardId);
    },

    async countCards() {
      return cards.length;
    },

    async clear() {
      cards.length = 0;
      reviews.length = 0;
    },
  };
}
