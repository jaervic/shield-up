/** Resolución del repositorio de PBQ activo (inyectable en tests). */

import { dexiePbqRepository } from './dexiePbqRepository';
import type { PbqRepository } from './pbqRepository';

let activeRepository: PbqRepository = dexiePbqRepository;

export function getPbqRepository(): PbqRepository {
  return activeRepository;
}

export function setPbqRepository(repository: PbqRepository): void {
  activeRepository = repository;
}

export function resetPbqRepository(): void {
  activeRepository = dexiePbqRepository;
}
