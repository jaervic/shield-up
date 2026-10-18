import { afterEach, describe, expect, it } from 'vitest';
import type { PbqAttempt } from '@/domain/pbq';
import {
  resetPbqRepository,
  setPbqRepository,
} from '@/features/pbq/data/repository';
import {
  getPbqById,
  listPbq,
  loadPbqProgress,
  submitTerminal,
  submitTopology,
} from '@/features/pbq/data/pbqService';
import { buildTerminalAttempt, buildTopologyAttempt } from '@/features/pbq/engine/attempts';
import { runTranscript } from '@/features/pbq/engine/terminal';
import { emptyPlacement, placeNode } from '@/features/pbq/engine/topology';
import { commandFor, makeTerminalPbq, makeTopologyPbq } from '../../helpers/pbq';
import { createMemoryPbqRepository } from '../../helpers/memoryPbqRepository';

const META = {
  attemptId: 'pbq_1',
  startedAt: '2026-03-01T10:00:00.000Z',
  completedAt: '2026-03-01T10:05:00.000Z',
};

afterEach(() => {
  resetPbqRepository();
});

describe('buildTopologyAttempt', () => {
  const pbq = makeTopologyPbq({
    zones: [
      { id: 'dmz', label: 'DMZ' },
      { id: 'interna', label: 'Red interna' },
    ],
    nodes: [
      { id: 'web', label: 'Servidor web', correctZoneId: 'dmz' },
      { id: 'db', label: 'Base de datos', correctZoneId: 'interna' },
    ],
  });

  it('resume la corrección en el registro persistible', () => {
    let placement = emptyPlacement(pbq);
    placement = placeNode(placement, 'web', 'dmz');
    placement = placeNode(placement, 'db', 'interna');

    const attempt = buildTopologyAttempt(pbq, placement, META);

    expect(attempt).toMatchObject({
      id: 'pbq_1',
      pbqId: pbq.id,
      kind: 'topology',
      scorePercent: 100,
      passed: true,
    });
    expect(attempt.nodeResults).toHaveLength(2);
    expect(attempt.objectiveResults).toBeUndefined();
  });

  it('registra el fallo con el detalle por activo', () => {
    const placement = placeNode(emptyPlacement(pbq), 'web', 'interna');
    const attempt = buildTopologyAttempt(pbq, placement, META);

    expect(attempt.scorePercent).toBe(0);
    expect(attempt.passed).toBe(false);
    expect(attempt.nodeResults?.[0]).toEqual({
      nodeId: 'web',
      placedZoneId: 'interna',
      correct: false,
    });
  });
});

describe('buildTerminalAttempt', () => {
  const pbq = makeTerminalPbq({
    tasks: [
      { id: 't1', description: 'Lista los puertos en escucha.', matcher: { program: 'ss', flags: ['l'] } },
      { id: 't2', description: 'Comprueba el host.', matcher: { program: 'ping', args: ['10.0.0.20'] } },
    ],
  });

  it('guarda los objetivos y cuántos comandos se ejecutaron', () => {
    const transcript = runTranscript(['ss -tlp', 'ping -c 1 10.0.0.20', 'help'], pbq.state);
    const attempt = buildTerminalAttempt(pbq, transcript, META);

    expect(attempt.kind).toBe('terminal');
    expect(attempt.scorePercent).toBe(100);
    expect(attempt.commandsRun).toBe(3);
    expect(attempt.objectiveResults?.every((result) => result.met)).toBe(true);
    expect(attempt.nodeResults).toBeUndefined();
  });

  it('deja constancia de los objetivos no cumplidos', () => {
    const attempt = buildTerminalAttempt(pbq, runTranscript(['help'], pbq.state), META);

    expect(attempt.scorePercent).toBe(0);
    expect(attempt.passed).toBe(false);
    expect(attempt.objectiveResults?.filter((result) => !result.met)).toHaveLength(2);
  });
});

describe('catálogo y servicio', () => {
  it('el catálogo sale del contenido', () => {
    const pbq = listPbq();
    expect(pbq.length).toBeGreaterThanOrEqual(5);
    expect(getPbqById(pbq[0]!.id)?.id).toBe(pbq[0]!.id);
    expect(getPbqById('no-existe')).toBeUndefined();
  });

  it('submitTopology corrige y persiste', async () => {
    const repository = createMemoryPbqRepository();
    setPbqRepository(repository);

    const pbq = listPbq().find((candidate) => candidate.kind === 'topology');
    if (pbq === undefined || pbq.kind !== 'topology') throw new Error('Falta una PBQ de topología');

    const placement = Object.fromEntries(pbq.nodes.map((node) => [node.id, node.correctZoneId]));
    const attempt = await submitTopology(pbq, placement, META.startedAt);

    expect(attempt.scorePercent).toBe(100);
    expect(repository.attempts).toHaveLength(1);
  });

  it('submitTerminal corrige y persiste', async () => {
    const repository = createMemoryPbqRepository();
    setPbqRepository(repository);

    const pbq = listPbq().find((candidate) => candidate.kind === 'terminal');
    if (pbq === undefined || pbq.kind !== 'terminal') throw new Error('Falta una PBQ de terminal');

    const transcript = runTranscript(pbq.tasks.map((task) => commandFor(task.matcher)), pbq.state);
    const attempt = await submitTerminal(pbq, transcript, META.startedAt);

    expect(attempt.scorePercent).toBe(100);
    expect(repository.attempts).toHaveLength(1);
  });
});

describe('loadPbqProgress', () => {
  function attempt(overrides: Partial<PbqAttempt>): PbqAttempt {
    return {
      id: overrides.id ?? 'a',
      pbqId: overrides.pbqId ?? 'pbq-1',
      kind: overrides.kind ?? 'topology',
      domain: 3,
      startedAt: META.startedAt,
      completedAt: overrides.completedAt ?? META.completedAt,
      scorePercent: overrides.scorePercent ?? 0,
      passed: overrides.passed ?? false,
    };
  }

  it('sin intentos, el progreso está vacío', async () => {
    setPbqRepository(createMemoryPbqRepository());
    expect(await loadPbqProgress()).toEqual({});
  });

  it('agrega intentos: cuenta, mejor nota y si se superó alguna vez', async () => {
    setPbqRepository(
      createMemoryPbqRepository([
        attempt({ id: 'a1', scorePercent: 40, completedAt: '2026-03-01T10:00:00.000Z' }),
        attempt({ id: 'a2', scorePercent: 100, passed: true, completedAt: '2026-03-02T10:00:00.000Z' }),
        attempt({ id: 'a3', pbqId: 'pbq-2', scorePercent: 60 }),
      ]),
    );

    const progress = await loadPbqProgress();

    expect(progress['pbq-1']).toEqual({
      attempts: 2,
      bestScorePercent: 100,
      passed: true,
      lastAttemptAt: '2026-03-02T10:00:00.000Z',
    });
    expect(progress['pbq-2']).toMatchObject({ attempts: 1, bestScorePercent: 60, passed: false });
  });
});
