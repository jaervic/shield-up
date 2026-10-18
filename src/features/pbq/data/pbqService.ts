/**
 * Servicio de aplicación de las PBQ: contenido, motor y persistencia.
 */

import { loadPbq } from '@/data/content/loadPbq';
import type { Pbq, PbqAttempt, TerminalPbq, TopologyPbq, TopologyPlacement, TranscriptEntry } from '@/domain/pbq';
import { createId } from '@/shared/utils/id';
import { buildTerminalAttempt, buildTopologyAttempt } from '../engine/attempts';
import { getPbqRepository } from './repository';

export function listPbq(): Pbq[] {
  return loadPbq();
}

export function getPbqById(pbqId: string): Pbq | undefined {
  return listPbq().find((pbq) => pbq.id === pbqId);
}

/** Resumen de progreso por PBQ, para el catálogo. */
export interface PbqProgress {
  attempts: number;
  bestScorePercent: number;
  passed: boolean;
  lastAttemptAt: string;
}

export async function loadPbqProgress(): Promise<Record<string, PbqProgress>> {
  const attempts = await getPbqRepository().getAttempts();
  const progress: Record<string, PbqProgress> = {};

  for (const attempt of attempts) {
    const current = progress[attempt.pbqId];
    if (current === undefined) {
      progress[attempt.pbqId] = {
        attempts: 1,
        bestScorePercent: attempt.scorePercent,
        passed: attempt.passed,
        lastAttemptAt: attempt.completedAt,
      };
      continue;
    }

    current.attempts += 1;
    current.bestScorePercent = Math.max(current.bestScorePercent, attempt.scorePercent);
    current.passed = current.passed || attempt.passed;
    if (attempt.completedAt > current.lastAttemptAt) current.lastAttemptAt = attempt.completedAt;
  }

  return progress;
}

async function persist(attempt: PbqAttempt): Promise<PbqAttempt> {
  await getPbqRepository().saveAttempt(attempt);
  return attempt;
}

function meta(startedAt: string, attemptId?: string) {
  return {
    attemptId: attemptId ?? createId('pbq'),
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

export async function submitTopology(
  pbq: TopologyPbq,
  placement: TopologyPlacement,
  startedAt: string,
): Promise<PbqAttempt> {
  return persist(buildTopologyAttempt(pbq, placement, meta(startedAt)));
}

export async function submitTerminal(
  pbq: TerminalPbq,
  transcript: readonly TranscriptEntry[],
  startedAt: string,
): Promise<PbqAttempt> {
  return persist(buildTerminalAttempt(pbq, transcript, meta(startedAt)));
}

export async function getAttemptsFor(pbqId: string): Promise<PbqAttempt[]> {
  return getPbqRepository().getAttemptsFor(pbqId);
}
