/**
 * Resolución del repositorio de diagnóstico activo.
 * Punto único de inyección para tests y para una futura capa de sincronización.
 */

import { dexieDiagnosticRepository } from './dexieDiagnosticRepository';
import type { DiagnosticRepository } from './diagnosticRepository';

let activeRepository: DiagnosticRepository = dexieDiagnosticRepository;

export function getDiagnosticRepository(): DiagnosticRepository {
  return activeRepository;
}

export function setDiagnosticRepository(repository: DiagnosticRepository): void {
  activeRepository = repository;
}

export function resetDiagnosticRepository(): void {
  activeRepository = dexieDiagnosticRepository;
}
