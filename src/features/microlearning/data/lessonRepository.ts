/**
 * Contrato de persistencia del progreso de lecciones.
 * Una fila por lección; el resto se deriva.
 */

import type { LessonProgress } from '@/domain/lesson';

export interface LessonRepository {
  getProgressMap(): Promise<Record<string, LessonProgress>>;
  getProgress(lessonId: string): Promise<LessonProgress | undefined>;
  saveProgress(progress: LessonProgress): Promise<void>;
  clear(): Promise<void>;
}
