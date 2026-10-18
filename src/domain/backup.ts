/**
 * Modelo de la copia de seguridad.
 *
 * Todo el progreso del usuario vive en IndexedDB, que es cómodo pero frágil: si
 * se limpian los datos del navegador, se pierde. La copia es un único fichero
 * JSON con las seis tablas.
 *
 * Módulo PURO (solo tipos y constantes).
 */

import type { Card, Review } from './card';
import type { DiagnosticAttempt } from './diagnostic';
import type { ExamAttempt } from './exam';
import type { LessonProgress } from './lesson';
import type { PbqAttempt } from './pbq';

export const BACKUP_APP = 'shieldup';
/** Se incrementa cuando cambie el formato de forma incompatible. */
export const BACKUP_VERSION = 1;

export interface BackupSnapshot {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  cards: Card[];
  reviews: Review[];
  diagnosticAttempts: DiagnosticAttempt[];
  lessonProgress: LessonProgress[];
  pbqAttempts: PbqAttempt[];
  examAttempts: ExamAttempt[];
}

/** El contenido de la copia, sin la cabecera. */
export type BackupPayload = Omit<BackupSnapshot, 'app' | 'version' | 'exportedAt'>;

export interface BackupSummary {
  cards: number;
  reviews: number;
  diagnosticAttempts: number;
  lessonProgress: number;
  pbqAttempts: number;
  examAttempts: number;
  totalRecords: number;
}
