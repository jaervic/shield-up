/**
 * Serialización y validación de la copia de seguridad.
 *
 * Módulo PURO. La validación es **estricta con el sobre** (app, versión y que
 * existan las seis colecciones) y **ligera con cada registro**: se comprueba que
 * es un objeto con su clave primaria.
 *
 * Validar campo a campo cada registro duplicaría el esquema del dominio y, peor,
 * haría que una copia legítima se rechazara tras cualquier cambio de modelo. La
 * forma de los datos ya está garantizada por el código que los escribió.
 */

import { z } from 'zod';
import {
  BACKUP_APP,
  BACKUP_VERSION,
  type BackupPayload,
  type BackupSnapshot,
  type BackupSummary,
} from '@/domain/backup';

const recordSchema = z.record(z.unknown());

const envelopeSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.number().int().positive(),
  exportedAt: z.string().min(1),
  cards: z.array(recordSchema),
  reviews: z.array(recordSchema),
  diagnosticAttempts: z.array(recordSchema),
  lessonProgress: z.array(recordSchema),
  pbqAttempts: z.array(recordSchema),
  examAttempts: z.array(recordSchema),
});

/** Colecciones y la clave primaria que debe tener cada registro. */
const COLLECTIONS: ReadonlyArray<readonly [keyof BackupPayload, string]> = [
  ['cards', 'id'],
  ['reviews', 'id'],
  ['diagnosticAttempts', 'id'],
  ['lessonProgress', 'lessonId'],
  ['pbqAttempts', 'id'],
  ['examAttempts', 'id'],
];

export function createSnapshot(payload: BackupPayload, now: Date = new Date()): BackupSnapshot {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    ...payload,
  };
}

export function serializeBackup(snapshot: BackupSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export function summarizeBackup(snapshot: BackupSnapshot): BackupSummary {
  const counts = Object.fromEntries(
    COLLECTIONS.map(([collection]) => [collection, snapshot[collection].length]),
  ) as Record<keyof BackupPayload, number>;

  return {
    ...counts,
    totalRecords: Object.values(counts).reduce((sum, count) => sum + count, 0),
  };
}

/**
 * Valida y devuelve la copia. Lanza un error con un mensaje comprensible: quien
 * importa un fichero equivocado merece saber por qué, no un fallo genérico.
 */
export function parseBackup(text: string): BackupSnapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('El fichero no es JSON válido.');
  }

  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join('.') ?? '';
    throw new Error(
      where.length > 0
        ? `La copia no tiene el formato esperado (campo "${where}").`
        : 'La copia no tiene el formato esperado.',
    );
  }

  if (parsed.data.version > BACKUP_VERSION) {
    throw new Error(
      `La copia es de una versión más reciente (v${parsed.data.version}) que esta aplicación (v${BACKUP_VERSION}).`,
    );
  }

  for (const [collection, key] of COLLECTIONS) {
    const records = parsed.data[collection];
    const broken = records.findIndex((record) => typeof record[key] !== 'string');
    if (broken >= 0) {
      throw new Error(`El registro ${broken + 1} de "${collection}" no tiene "${key}".`);
    }
  }

  // Los registros ya han pasado el control de forma (son objetos con su clave
  // primaria). El salto de tipo es consciente: quien escribió la copia es el
  // mismo código que define los tipos del dominio.
  return parsed.data as unknown as BackupSnapshot;
}

/** Nombre de fichero sugerido, con la fecha para no sobrescribir copias. */
export function backupFileName(now: Date = new Date()): string {
  return `shieldup-${now.toISOString().slice(0, 10)}.json`;
}
