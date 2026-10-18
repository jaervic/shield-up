/**
 * Construcción del intento de PBQ a partir de su corrección.
 *
 * Módulo PURO. Convierte el resultado del motor en el registro que se persiste,
 * de modo que el servicio solo tenga que guardarlo.
 */

import type { PbqAttempt, TerminalPbq, TopologyPbq, TopologyPlacement, TranscriptEntry } from '@/domain/pbq';
import { evaluateTerminal } from './terminal';
import { evaluateTopology } from './topology';

export interface AttemptMeta {
  attemptId: string;
  startedAt: string;
  completedAt: string;
}

export function buildTopologyAttempt(
  pbq: TopologyPbq,
  placement: TopologyPlacement,
  meta: AttemptMeta,
): PbqAttempt {
  const evaluation = evaluateTopology(pbq, placement);

  return {
    id: meta.attemptId,
    pbqId: pbq.id,
    kind: 'topology',
    domain: pbq.domain,
    startedAt: meta.startedAt,
    completedAt: meta.completedAt,
    scorePercent: evaluation.scorePercent,
    passed: evaluation.passed,
    nodeResults: evaluation.nodeResults,
  };
}

export function buildTerminalAttempt(
  pbq: TerminalPbq,
  transcript: readonly TranscriptEntry[],
  meta: AttemptMeta,
): PbqAttempt {
  const evaluation = evaluateTerminal(pbq, transcript);

  return {
    id: meta.attemptId,
    pbqId: pbq.id,
    kind: 'terminal',
    domain: pbq.domain,
    startedAt: meta.startedAt,
    completedAt: meta.completedAt,
    scorePercent: evaluation.scorePercent,
    passed: evaluation.passed,
    objectiveResults: evaluation.objectiveResults,
    commandsRun: transcript.length,
  };
}
