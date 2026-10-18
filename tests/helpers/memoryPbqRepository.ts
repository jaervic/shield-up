import type { PbqAttempt } from '@/domain/pbq';
import type { PbqRepository } from '@/features/pbq/data/pbqRepository';

export interface MemoryPbqRepository extends PbqRepository {
  attempts: PbqAttempt[];
}

export function createMemoryPbqRepository(initial: PbqAttempt[] = []): MemoryPbqRepository {
  const attempts = [...initial];

  return {
    attempts,

    async saveAttempt(attempt) {
      const index = attempts.findIndex((existing) => existing.id === attempt.id);
      if (index >= 0) attempts[index] = attempt;
      else attempts.push(attempt);
    },

    async getAttempts() {
      return [...attempts].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    },

    async getAttemptsFor(pbqId) {
      return attempts.filter((attempt) => attempt.pbqId === pbqId);
    },

    async clear() {
      attempts.length = 0;
    },
  };
}
