/** Implementación de `SrsRepository` sobre IndexedDB (Dexie). */

import { db } from '@/data/db';
import type { SrsRepository } from './srsRepository';

export const dexieSrsRepository: SrsRepository = {
  async getCards() {
    return db.cards.toArray();
  },

  async getCard(id) {
    return db.cards.get(id);
  },

  async saveCard(card) {
    await db.cards.put(card);
  },

  async saveCards(cards) {
    await db.cards.bulkPut([...cards]);
  },

  async logReview(review) {
    await db.reviews.put(review);
  },

  async getReviews() {
    return db.reviews.toArray();
  },

  async getReviewsForCard(cardId) {
    return db.reviews.where('cardId').equals(cardId).toArray();
  },

  async countCards() {
    return db.cards.count();
  },

  async clear() {
    await db.transaction('rw', db.cards, db.reviews, async () => {
      await db.cards.clear();
      await db.reviews.clear();
    });
  },
};
