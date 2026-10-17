import type { LessonProgress } from '@/domain/lesson';
import type { LessonRepository } from '@/features/microlearning/data/lessonRepository';

export interface MemoryLessonRepository extends LessonRepository {
  rows: Record<string, LessonProgress>;
}

/** Repositorio de lecciones en memoria para tests: misma interfaz, sin IndexedDB. */
export function createMemoryLessonRepository(
  initial: LessonProgress[] = [],
): MemoryLessonRepository {
  const rows: Record<string, LessonProgress> = {};
  for (const progress of initial) {
    rows[progress.lessonId] = progress;
  }

  return {
    rows,

    async getProgressMap() {
      return { ...rows };
    },

    async getProgress(lessonId) {
      return rows[lessonId];
    },

    async saveProgress(progress) {
      rows[progress.lessonId] = progress;
    },

    async clear() {
      for (const key of Object.keys(rows)) {
        delete rows[key];
      }
    },
  };
}
