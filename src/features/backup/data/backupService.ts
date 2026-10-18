/**
 * Servicio de copia de seguridad: une motor y almacén.
 */

import type { BackupPayload, BackupSnapshot } from '@/domain/backup';
import { readAllData, clearAllData, replaceAllData } from '@/data/backupGateway';
import { ensureContentSeeded } from '@/features/srs/data/seedService';
import { backupFileName, createSnapshot, parseBackup, serializeBackup } from '../engine/backup';

/** Reúne todo el progreso actual en una copia. */
export async function collectBackup(now: Date = new Date()): Promise<BackupSnapshot> {
  return createSnapshot(await readAllData(), now);
}

/** Sustituye TODO el progreso por el de la copia. */
export async function restoreBackup(snapshot: BackupSnapshot): Promise<void> {
  const payload: BackupPayload = {
    cards: snapshot.cards,
    reviews: snapshot.reviews,
    diagnosticAttempts: snapshot.diagnosticAttempts,
    lessonProgress: snapshot.lessonProgress,
    pbqAttempts: snapshot.pbqAttempts,
    examAttempts: snapshot.examAttempts,
  };

  await replaceAllData(payload);
}

/**
 * Borra el progreso y vuelve a sembrar el contenido.
 *
 * Las tarjetas son a la vez contenido y progreso (llevan su factor de facilidad
 * y su fecha de repaso), así que se borran y se vuelven a crear desde el
 * contenido: el usuario recupera el mazo intacto, sin historial.
 */
export async function resetProgress(): Promise<void> {
  await clearAllData();
  await ensureContentSeeded();
}

export async function readBackupFile(file: File): Promise<BackupSnapshot> {
  return parseBackup(await file.text());
}

/**
 * Descarga la copia como fichero.
 *
 * `createObjectURL` no existe en jsdom, así que la parte pura (serializar y
 * validar) es la que se testea; aquí solo queda el efecto sobre el navegador.
 */
export function downloadBackup(snapshot: BackupSnapshot, now: Date = new Date()): void {
  const blob = new Blob([serializeBackup(snapshot)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = backupFileName(now);
  anchor.click();

  URL.revokeObjectURL(url);
}
