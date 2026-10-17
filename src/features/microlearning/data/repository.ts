/**
 * Resolución del repositorio de lecciones activo.
 * Punto único de inyección para tests y para una futura capa de sync.
 */

import { dexieLessonRepository } from './dexieLessonRepository';
import type { LessonRepository } from './lessonRepository';

let activeRepository: LessonRepository = dexieLessonRepository;

export function getLessonRepository(): LessonRepository {
  return activeRepository;
}

export function setLessonRepository(repository: LessonRepository): void {
  activeRepository = repository;
}

export function resetLessonRepository(): void {
  activeRepository = dexieLessonRepository;
}
