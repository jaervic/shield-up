import { describe, expect, it } from 'vitest';
import { BACKUP_VERSION } from '@/domain/backup';
import {
  backupFileName,
  createSnapshot,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from '@/features/backup/engine/backup';
import { makeCard, makeReview } from '../../helpers/backup';

const NOW = new Date('2026-03-01T10:00:00.000Z');

const payload = {
  cards: [makeCard('port-ssh')],
  reviews: [makeReview('rev-1')],
  diagnosticAttempts: [],
  lessonProgress: [],
  pbqAttempts: [],
  examAttempts: [],
};

/**
 * Sobre crudo, para construir copias deliberadamente malformadas.
 * Se escribe a mano y sin tipos para poder romperlo campo a campo.
 */
function rawEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    app: 'shieldup',
    version: BACKUP_VERSION,
    exportedAt: NOW.toISOString(),
    cards: [],
    reviews: [],
    diagnosticAttempts: [],
    lessonProgress: [],
    pbqAttempts: [],
    examAttempts: [],
    ...overrides,
  };
}

describe('createSnapshot / serializeBackup', () => {
  it('añade el sobre con app, versión y fecha', () => {
    const snapshot = createSnapshot(payload, NOW);

    expect(snapshot.app).toBe('shieldup');
    expect(snapshot.version).toBe(BACKUP_VERSION);
    expect(snapshot.exportedAt).toBe(NOW.toISOString());
    expect(snapshot.cards).toHaveLength(1);
  });

  it('serializa a JSON legible y con salto final', () => {
    const text = serializeBackup(createSnapshot(payload, NOW));

    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  "app": "shieldup"');
  });
});

describe('parseBackup', () => {
  it('recupera exactamente lo que se serializó', () => {
    const original = createSnapshot(payload, NOW);
    const restored = parseBackup(serializeBackup(original));

    expect(restored).toEqual(original);
  });

  it('rechaza algo que no es JSON', () => {
    expect(() => parseBackup('esto no es json')).toThrow(/JSON válido/i);
  });

  it('rechaza un JSON que no es una copia de ShieldUp', () => {
    expect(() => parseBackup('{"hola":1}')).toThrow(/formato esperado/i);
    expect(() => parseBackup('{"app":"otra","version":1}')).toThrow(/formato esperado/i);
  });

  it('rechaza una copia de una versión más reciente', () => {
    const text = JSON.stringify({ ...createSnapshot(payload, NOW), version: BACKUP_VERSION + 1 });

    expect(() => parseBackup(text)).toThrow(/más reciente/i);
  });

  it('señala la colección que falta', () => {
    const raw: Record<string, unknown> = { ...rawEnvelope() };
    delete raw.examAttempts;

    expect(() => parseBackup(JSON.stringify(raw))).toThrow(/examAttempts/);
  });

  it('señala el registro sin clave primaria', () => {
    const raw = rawEnvelope({ cards: [{ sin: 'id' }] });

    expect(() => parseBackup(JSON.stringify(raw))).toThrow(/no tiene "id"/);
  });

  it('acepta una copia sin registros', () => {
    const empty = createSnapshot(
      {
        cards: [],
        reviews: [],
        diagnosticAttempts: [],
        lessonProgress: [],
        pbqAttempts: [],
        examAttempts: [],
      },
      NOW,
    );

    expect(parseBackup(serializeBackup(empty)).cards).toEqual([]);
  });

  it('acepta campos de más en los registros', () => {
    const raw = rawEnvelope({ cards: [{ id: 'x', futuro: true }] });

    expect(parseBackup(JSON.stringify(raw)).cards[0]).toMatchObject({ id: 'x' });
  });
});

describe('summarizeBackup', () => {
  it('cuenta cada colección y el total', () => {
    const summary = summarizeBackup(createSnapshot({ ...payload, reviews: [] }, NOW));

    expect(summary).toMatchObject({ cards: 1, reviews: 0, totalRecords: 1 });
  });

  it('una copia vacía suma cero', () => {
    const empty = createSnapshot(
      {
        cards: [],
        reviews: [],
        diagnosticAttempts: [],
        lessonProgress: [],
        pbqAttempts: [],
        examAttempts: [],
      },
      NOW,
    );

    expect(summarizeBackup(empty).totalRecords).toBe(0);
  });
});

describe('backupFileName', () => {
  it('incluye la fecha para no sobrescribir copias', () => {
    expect(backupFileName(NOW)).toBe('shieldup-2026-03-01.json');
  });
});
