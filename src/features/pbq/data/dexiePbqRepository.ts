/** Implementación de `PbqRepository` sobre IndexedDB (Dexie). */

import { db } from '@/data/db';
import type { PbqRepository } from './pbqRepository';

export const dexiePbqRepository: PbqRepository = {
  async saveAttempt(attempt) {
    await db.pbqAttempts.put(attempt);
  },

  async getAttempts() {
    return db.pbqAttempts.orderBy('completedAt').reverse().toArray();
  },

  async getAttemptsFor(pbqId) {
    return db.pbqAttempts.where('pbqId').equals(pbqId).toArray();
  },

  async clear() {
    await db.pbqAttempts.clear();
  },
};
