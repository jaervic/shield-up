/**
 * Operaciones sobre TODA la base de datos, en una sola transacción.
 *
 * Vive en la capa de datos y no en los repositorios porque leer o reemplazar el
 * conjunto completo es una operación del almacén, no de una entidad. Hacerlo
 * repositorio a repositorio dejaría la base a medias si algo fallara a mitad.
 */

import { db } from './db';
import type { BackupPayload } from '@/domain/backup';

export async function readAllData(): Promise<BackupPayload> {
  const [cards, reviews, diagnosticAttempts, lessonProgress, pbqAttempts, examAttempts] =
    await Promise.all([
      db.cards.toArray(),
      db.reviews.toArray(),
      db.diagnosticAttempts.toArray(),
      db.lessonProgress.toArray(),
      db.pbqAttempts.toArray(),
      db.examAttempts.toArray(),
    ]);

  return { cards, reviews, diagnosticAttempts, lessonProgress, pbqAttempts, examAttempts };
}

/** Borra todo y escribe la copia, todo o nada. */
export async function replaceAllData(payload: BackupPayload): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await db.cards.bulkPut(payload.cards);
    await db.reviews.bulkPut(payload.reviews);
    await db.diagnosticAttempts.bulkPut(payload.diagnosticAttempts);
    await db.lessonProgress.bulkPut(payload.lessonProgress);
    await db.pbqAttempts.bulkPut(payload.pbqAttempts);
    await db.examAttempts.bulkPut(payload.examAttempts);
  });
}

/** Borra todo el progreso. */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}
