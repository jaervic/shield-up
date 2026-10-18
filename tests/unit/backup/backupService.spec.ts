import { afterEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { createSnapshot, summarizeBackup } from '@/features/backup/engine/backup';
import {
  collectBackup,
  resetProgress,
  restoreBackup,
} from '@/features/backup/data/backupService';
import { makeCard, makeReview } from '../../helpers/backup';

/**
 * Estas pruebas tocan Dexie directamente, sin React. Fuera de `act()` IndexedDB
 * resuelve con normalidad (dentro, jsdom no entrega los eventos).
 */

async function emptyDatabase(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}

afterEach(async () => {
  await emptyDatabase();
});

describe('collectBackup', () => {
  it('recoge lo que hay en cada tabla', async () => {
    await db.cards.bulkPut([makeCard('a'), makeCard('b')]);
    await db.reviews.put(makeReview('r1'));

    const snapshot = await collectBackup(new Date('2026-03-01T10:00:00.000Z'));

    expect(snapshot.app).toBe('shieldup');
    expect(summarizeBackup(snapshot)).toMatchObject({
      cards: 2,
      reviews: 1,
      examAttempts: 0,
      totalRecords: 3,
    });
  });

  it('con la base vacía devuelve colecciones vacías', async () => {
    const snapshot = await collectBackup();

    expect(summarizeBackup(snapshot).totalRecords).toBe(0);
  });
});

describe('restoreBackup', () => {
  it('sustituye el contenido actual por el de la copia', async () => {
    await db.cards.put(makeCard('vieja'));

    await restoreBackup(createSnapshot(
      {
        cards: [makeCard('nueva')],
        reviews: [makeReview('r1')],
        diagnosticAttempts: [],
        lessonProgress: [],
        pbqAttempts: [],
        examAttempts: [],
      },
      new Date(),
    ));

    const cards = await db.cards.toArray();
    expect(cards.map((card) => card.id)).toEqual(['nueva']);
    expect(await db.reviews.count()).toBe(1);
  });

  it('no deja restos de la copia anterior', async () => {
    await restoreBackup(createSnapshot(
      {
        cards: [makeCard('primera')],
        reviews: [],
        diagnosticAttempts: [],
        lessonProgress: [],
        pbqAttempts: [],
        examAttempts: [],
      },
      new Date(),
    ));

    await restoreBackup(createSnapshot(
      {
        cards: [makeCard('segunda')],
        reviews: [],
        diagnosticAttempts: [],
        lessonProgress: [],
        pbqAttempts: [],
        examAttempts: [],
      },
      new Date(),
    ));

    expect((await db.cards.toArray()).map((card) => card.id)).toEqual(['segunda']);
  });
});

describe('resetProgress', () => {
  it('borra el historial y vuelve a sembrar el mazo', async () => {
    await db.cards.put(makeCard('port-ssh', { repetitions: 4, intervalDays: 30 }));
    await db.reviews.put(makeReview('r1'));

    await resetProgress();

    // El contenido vuelve, pero sin progreso: las tarjetas quedan nuevas.
    const cards = await db.cards.toArray();
    expect(cards.length).toBeGreaterThan(40);
    expect(cards.every((card) => card.repetitions === 0 && card.lastReviewedAt === null)).toBe(true);
    expect(await db.reviews.count()).toBe(0);
  });

  it('no duplica el contenido si se reinicia dos veces', async () => {
    await resetProgress();
    const first = await db.cards.count();

    await resetProgress();
    expect(await db.cards.count()).toBe(first);
  });
});
