/** Implementación de `DiagnosticRepository` sobre IndexedDB (Dexie). */

import { db } from '@/data/db';
import type { DiagnosticRepository } from './diagnosticRepository';

export const dexieDiagnosticRepository: DiagnosticRepository = {
  async saveAttempt(attempt) {
    await db.diagnosticAttempts.put(attempt);
  },

  async getAttempts() {
    return db.diagnosticAttempts.orderBy('completedAt').reverse().toArray();
  },

  async getLatestAttempt() {
    const attempts = await db.diagnosticAttempts.orderBy('completedAt').reverse().limit(1).toArray();
    return attempts[0] ?? null;
  },

  async clear() {
    await db.diagnosticAttempts.clear();
  },
};
