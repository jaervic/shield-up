/**
 * Contrato de persistencia del diagnóstico.
 *
 * Igual que con el SRS, la app depende de esta interfaz y no de Dexie: añadir
 * sincronización no obliga a tocar el motor ni la UI.
 */

import type { DiagnosticAttempt } from '@/domain/diagnostic';

export interface DiagnosticRepository {
  saveAttempt(attempt: DiagnosticAttempt): Promise<void>;
  getAttempts(): Promise<DiagnosticAttempt[]>;
  getLatestAttempt(): Promise<DiagnosticAttempt | null>;
  clear(): Promise<void>;
}
