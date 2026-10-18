/** Resolución del repositorio de examen activo (inyectable en tests). */

import { dexieExamRepository } from './dexieExamRepository';
import type { ExamRepository } from './examRepository';

let activeRepository: ExamRepository = dexieExamRepository;

export function getExamRepository(): ExamRepository {
  return activeRepository;
}

export function setExamRepository(repository: ExamRepository): void {
  activeRepository = repository;
}

export function resetExamRepository(): void {
  activeRepository = dexieExamRepository;
}
