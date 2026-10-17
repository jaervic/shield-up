/**
 * Resolución del repositorio activo.
 *
 * Punto único de inyección: los tests (y una futura capa de sync) sustituyen
 * la implementación aquí sin tocar el resto de la aplicación.
 */

import { dexieSrsRepository } from './dexieSrsRepository';
import type { SrsRepository } from './srsRepository';

let activeRepository: SrsRepository = dexieSrsRepository;

export function getSrsRepository(): SrsRepository {
  return activeRepository;
}

export function setSrsRepository(repository: SrsRepository): void {
  activeRepository = repository;
}

export function resetSrsRepository(): void {
  activeRepository = dexieSrsRepository;
}
