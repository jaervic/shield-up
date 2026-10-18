/** Implementación de `ExamRepository` sobre IndexedDB (Dexie). */

import { db } from '@/data/db';
import type { ExamRepository } from './examRepository';

export const dexieExamRepository: ExamRepository = {
  async saveAttempt(attempt) {
    await db.examAttempts.put(attempt);
  },

  async getAttempts() {
    return db.examAttempts.orderBy('completedAt').reverse().toArray();
  },

  async getLatestAttempt() {
    const attempts = await db.examAttempts.orderBy('completedAt').reverse().limit(1).toArray();
    return attempts[0] ?? null;
  },

  async clear() {
    await db.examAttempts.clear();
  },
};
