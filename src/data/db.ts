/**
 * Definición de la base de datos local (IndexedDB vía Dexie).
 *
 * Offline-first: toda la app funciona sin backend. Las migraciones se añaden
 * como `this.version(n).stores({...})` para no romper datos de usuarios.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { Card, Review } from '@/domain/card';

export const DATABASE_NAME = 'shieldup';

export class ShieldUpDatabase extends Dexie {
  cards!: EntityTable<Card, 'id'>;
  reviews!: EntityTable<Review, 'id'>;

  constructor() {
    super(DATABASE_NAME);

    this.version(1).stores({
      // Índices: dueAt para la cola diaria, domain/type para filtros y stats.
      cards: 'id, dueAt, domain, type, repetitions, lastReviewedAt, suspended',
      reviews: 'id, cardId, reviewedAt',
    });
  }
}

export const db = new ShieldUpDatabase();
