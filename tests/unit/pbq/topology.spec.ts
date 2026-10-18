import { describe, expect, it } from 'vitest';
import type { TopologyPbq } from '@/domain/pbq';
import {
  countPlaced,
  emptyPlacement,
  evaluateTopology,
  isPlacementComplete,
  placeNode,
  summarizePlacement,
} from '@/features/pbq/engine/topology';
import { makeTopologyPbq } from '../../helpers/pbq';

const PBQ: TopologyPbq = makeTopologyPbq({
  zones: [
    { id: 'dmz', label: 'DMZ' },
    { id: 'interna', label: 'Red interna' },
  ],
  nodes: [
    { id: 'web', label: 'Servidor web', correctZoneId: 'dmz' },
    { id: 'db', label: 'Base de datos', correctZoneId: 'interna' },
    { id: 'dc', label: 'Controlador de dominio', correctZoneId: 'interna' },
    { id: 'mail', label: 'Correo', correctZoneId: 'dmz' },
    { id: 'wks', label: 'Puesto de trabajo', correctZoneId: 'interna' },
  ],
});

function placementOf(entries: Record<string, string | null>) {
  return { ...emptyPlacement(PBQ), ...entries };
}

describe('emptyPlacement / placeNode', () => {
  it('empieza con todos los activos sin colocar', () => {
    const placement = emptyPlacement(PBQ);
    expect(Object.keys(placement)).toHaveLength(PBQ.nodes.length);
    expect(Object.values(placement).every((zone) => zone === null)).toBe(true);
  });

  it('coloca y retira sin mutar el mapa anterior', () => {
    const initial = emptyPlacement(PBQ);
    const placed = placeNode(initial, 'web', 'dmz');

    expect(placed.web).toBe('dmz');
    expect(initial.web).toBeNull();
    expect(placeNode(placed, 'web', null).web).toBeNull();
  });

  it('ignora activos que no existen', () => {
    expect(placeNode(emptyPlacement(PBQ), 'fantasma', 'dmz').fantasma).toBe('dmz');
  });
});

describe('evaluateTopology', () => {
  it('sin colocar nada, cero aciertos y sin superar', () => {
    const evaluation = evaluateTopology(PBQ, emptyPlacement(PBQ));

    expect(evaluation.correctCount).toBe(0);
    expect(evaluation.scorePercent).toBe(0);
    expect(evaluation.passed).toBe(false);
    expect(evaluation.unplaced).toHaveLength(5);
    expect(evaluation.misplaced).toHaveLength(0);
  });

  it('con todo bien colocado, supera con el 100%', () => {
    const placement = placementOf({ web: 'dmz', db: 'interna', dc: 'interna', mail: 'dmz', wks: 'interna' });
    const evaluation = evaluateTopology(PBQ, placement);

    expect(evaluation.correctCount).toBe(5);
    expect(evaluation.scorePercent).toBe(100);
    expect(evaluation.passed).toBe(true);
    expect(evaluation.misplaced).toHaveLength(0);
  });

  it('separa los activos mal colocados de los no colocados', () => {
    const placement = placementOf({ web: 'interna', db: 'interna', dc: 'interna', mail: 'dmz' });
    const evaluation = evaluateTopology(PBQ, placement);

    expect(evaluation.correctCount).toBe(3);
    expect(evaluation.misplaced.map((result) => result.nodeId)).toEqual(['web']);
    expect(evaluation.unplaced.map((result) => result.nodeId)).toEqual(['wks']);
  });

  it('el umbral de superación es el 80%', () => {
    // 4 de 5 = 80% → supera
    const passing = placementOf({ web: 'dmz', db: 'interna', dc: 'interna', mail: 'dmz', wks: 'dmz' });
    expect(evaluateTopology(PBQ, passing).scorePercent).toBe(80);
    expect(evaluateTopology(PBQ, passing).passed).toBe(true);

    // 3 de 5 = 60% → no supera
    const failing = placementOf({ web: 'interna', db: 'interna', dc: 'interna', mail: 'dmz', wks: 'dmz' });
    expect(evaluateTopology(PBQ, failing).scorePercent).toBe(60);
    expect(evaluateTopology(PBQ, failing).passed).toBe(false);
  });

  it('devuelve un resultado por activo, en el orden del enunciado', () => {
    const evaluation = evaluateTopology(PBQ, emptyPlacement(PBQ));
    expect(evaluation.nodeResults.map((result) => result.nodeId)).toEqual(
      PBQ.nodes.map((node) => node.id),
    );
  });
});

describe('isPlacementComplete / countPlaced', () => {
  it('detecta si falta algún activo por colocar', () => {
    expect(isPlacementComplete(PBQ, emptyPlacement(PBQ))).toBe(false);
    expect(countPlaced(PBQ, emptyPlacement(PBQ))).toBe(0);

    const partial = placementOf({ web: 'dmz', db: 'interna' });
    expect(isPlacementComplete(PBQ, partial)).toBe(false);
    expect(countPlaced(PBQ, partial)).toBe(2);
  });

  it('completa cuando todos tienen zona', () => {
    const full = placementOf({ web: 'dmz', db: 'interna', dc: 'interna', mail: 'dmz', wks: 'interna' });
    expect(isPlacementComplete(PBQ, full)).toBe(true);
    expect(countPlaced(PBQ, full)).toBe(5);
  });
});

describe('summarizePlacement', () => {
  it('agrupa los activos por zona', () => {
    const summary = summarizePlacement(
      PBQ,
      placementOf({ web: 'dmz', mail: 'dmz', db: 'interna' }),
    );

    expect(summary).toHaveLength(2);
    expect(summary[0]?.zone.id).toBe('dmz');
    expect(summary[0]?.nodeIds).toEqual(['web', 'mail']);
    expect(summary[1]?.nodeIds).toEqual(['db']);
  });
});
