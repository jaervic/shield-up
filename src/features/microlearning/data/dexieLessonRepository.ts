/** Implementación de `LessonRepository` sobre IndexedDB (Dexie). */

import { db } from '@/data/db';
import type { LessonProgress } from '@/domain/lesson';
import type { LessonRepository } from './lessonRepository';

export const dexieLessonRepository: LessonRepository = {
  async getProgressMap() {
    const rows = await db.lessonProgress.toArray();
    const map: Record<string, LessonProgress> = {};
    for (const row of rows) {
      map[row.lessonId] = row;
    }
    return map;
  },

  async getProgress(lessonId) {
    return db.lessonProgress.get(lessonId);
  },

  async saveProgress(progress) {
    await db.lessonProgress.put(progress);
  },

  async clear() {
    await db.lessonProgress.clear();
  },
};
