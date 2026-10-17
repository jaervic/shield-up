import type { DiagnosticAttempt } from '@/domain/diagnostic';
import type { DiagnosticRepository } from '@/features/diagnostic/data/diagnosticRepository';

export interface MemoryDiagnosticRepository extends DiagnosticRepository {
  attempts: DiagnosticAttempt[];
}

/** Repositorio de diagnóstico en memoria para tests: misma interfaz, sin IndexedDB. */
export function createMemoryDiagnosticRepository(
  initial: DiagnosticAttempt[] = [],
): MemoryDiagnosticRepository {
  const attempts = [...initial];

  return {
    attempts,

    async saveAttempt(attempt) {
      const index = attempts.findIndex((existing) => existing.id === attempt.id);
      if (index >= 0) {
        attempts[index] = attempt;
      } else {
        attempts.push(attempt);
      }
    },

    async getAttempts() {
      return [...attempts].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    },

    async getLatestAttempt() {
      const sorted = await this.getAttempts();
      return sorted[0] ?? null;
    },

    async clear() {
      attempts.length = 0;
    },
  };
}
