/**
 * Corrección de las PBQ de topología.
 *
 * Módulo PURO. La colocación es un mapa `nodeId → zoneId` (o null si el activo
 * no se ha colocado), y se corrige activo a activo: cada acierto es un punto y
 * el error se explica zona por zona.
 */

import type {
  TopologyNodeResult,
  TopologyPbq,
  TopologyPlacement,
  TopologyZone,
} from '@/domain/pbq';
import { isPassed, scorePercent } from './scoring';

export interface TopologyEvaluation {
  nodeResults: TopologyNodeResult[];
  correctCount: number;
  totalNodes: number;
  scorePercent: number;
  passed: boolean;
  /** Activos colocados en una zona distinta de la correcta. */
  misplaced: TopologyNodeResult[];
  /** Activos sin colocar. */
  unplaced: TopologyNodeResult[];
}

export function emptyPlacement(pbq: TopologyPbq): TopologyPlacement {
  const placement: TopologyPlacement = {};
  for (const node of pbq.nodes) placement[node.id] = null;
  return placement;
}

/** Coloca (o retira, con `zoneId = null`) un activo. No muta la entrada. */
export function placeNode(
  placement: TopologyPlacement,
  nodeId: string,
  zoneId: string | null,
): TopologyPlacement {
  return { ...placement, [nodeId]: zoneId };
}

export function evaluateTopology(
  pbq: TopologyPbq,
  placement: TopologyPlacement,
): TopologyEvaluation {
  const nodeResults: TopologyNodeResult[] = pbq.nodes.map((node) => {
    const placedZoneId = placement[node.id] ?? null;
    return { nodeId: node.id, placedZoneId, correct: placedZoneId === node.correctZoneId };
  });

  const correctCount = nodeResults.filter((result) => result.correct).length;
  const totalNodes = nodeResults.length;
  const score = scorePercent(correctCount, totalNodes);

  return {
    nodeResults,
    correctCount,
    totalNodes,
    scorePercent: score,
    passed: isPassed(score),
    misplaced: nodeResults.filter((result) => !result.correct && result.placedZoneId !== null),
    unplaced: nodeResults.filter((result) => result.placedZoneId === null),
  };
}

/** Activos que quedaron en cada zona, para pintar el resultado. */
export function summarizePlacement(
  pbq: TopologyPbq,
  placement: TopologyPlacement,
): Array<{ zone: TopologyZone; nodeIds: string[] }> {
  return pbq.zones.map((zone) => ({
    zone,
    nodeIds: pbq.nodes
      .filter((node) => placement[node.id] === zone.id)
      .map((node) => node.id),
  }));
}

/** ¿Están todos los activos colocados? La UI lo usa para habilitar el envío. */
export function isPlacementComplete(pbq: TopologyPbq, placement: TopologyPlacement): boolean {
  return pbq.nodes.every((node) => (placement[node.id] ?? null) !== null);
}

export function countPlaced(pbq: TopologyPbq, placement: TopologyPlacement): number {
  return pbq.nodes.filter((node) => (placement[node.id] ?? null) !== null).length;
}
