/**
 * Contrato de persistencia de las PBQ.
 * Igual que en el resto: la app depende de la interfaz, no de Dexie.
 */

import type { PbqAttempt } from '@/domain/pbq';

export interface PbqRepository {
  saveAttempt(attempt: PbqAttempt): Promise<void>;
  getAttempts(): Promise<PbqAttempt[]>;
  getAttemptsFor(pbqId: string): Promise<PbqAttempt[]>;
  clear(): Promise<void>;
}
