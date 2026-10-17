/**
 * Definición de la base de datos local (IndexedDB vía Dexie).
 *
 * Offline-first: toda la app funciona sin backend. Las migraciones se añaden
 * como `this.version(n).stores({...})` para no romper datos de usuarios.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { Card, Review } from '@/domain/card';
import type { DiagnosticAttempt } from '@/domain/diagnostic';
import type { LessonProgress } from '@/domain/lesson';

export const DATABASE_NAME = 'shieldup';

export class ShieldUpDatabase extends Dexie {
  cards!: EntityTable<Card, 'id'>;
  reviews!: EntityTable<Review, 'id'>;
  diagnosticAttempts!: EntityTable<DiagnosticAttempt, 'id'>;
  lessonProgress!: EntityTable<LessonProgress, 'lessonId'>;

  constructor() {
    super(DATABASE_NAME);

    this.version(1).stores({
      // Índices: dueAt para la cola diaria, domain/type para filtros y stats.
      cards: 'id, dueAt, domain, type, repetitions, lastReviewedAt, suspended',
      reviews: 'id, cardId, reviewedAt',
    });

    // v2: historial de tests de diagnóstico. Las tablas no declaradas se heredan.
    this.version(2).stores({
      diagnosticAttempts: 'id, completedAt',
    });

    // v3: progreso de las lecciones de microlearning.
    this.version(3).stores({
      lessonProgress: 'lessonId, domain, status, updatedAt',
    });
  }
}

export const db = new ShieldUpDatabase();
