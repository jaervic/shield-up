/**
 * Medición del rendimiento por dominio.
 *
 * Módulo PURO. La "readiness" se pondera por el peso de cada dominio en el
 * examen y se renormaliza sobre los dominios realmente evaluados, de modo que
 * un dominio ausente no penalice artificialmente el resultado.
 */

import type { DomainProficiency } from '@/domain/diagnostic';
import { DOMAIN_IDS, DOMAIN_WEIGHTS, type DomainId } from '@/domain/domain';
import type { AnswerRecord, Question } from '@/domain/question';
import { round2 } from '@/shared/utils/math';

export function createEmptyProficiency(): Record<DomainId, DomainProficiency> {
  const result = {} as Record<DomainId, DomainProficiency>;
  for (const id of DOMAIN_IDS) {
    result[id] = { domain: id, asked: 0, correct: 0, accuracy: 0, evaluated: false };
  }
  return result;
}

export function computeProficiency(
  questions: readonly Question[],
  answers: readonly AnswerRecord[],
): Record<DomainId, DomainProficiency> {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const result = createEmptyProficiency();

  for (const answer of answers) {
    const question = questionById.get(answer.questionId);
    if (!question) continue;

    const entry = result[question.domain];
    entry.asked += 1;
    if (answer.isCorrect) entry.correct += 1;
  }

  for (const id of DOMAIN_IDS) {
    const entry = result[id];
    entry.evaluated = entry.asked > 0;
    entry.accuracy = entry.asked > 0 ? round2(entry.correct / entry.asked) : 0;
  }

  return result;
}

/** 0..1. Devuelve 0 si no se evaluó ningún dominio. */
export function computeReadiness(
  proficiency: Readonly<Record<DomainId, DomainProficiency>>,
  weights: Readonly<Record<DomainId, number>> = DOMAIN_WEIGHTS,
): number {
  let weightedAccuracy = 0;
  let weightSum = 0;

  for (const id of DOMAIN_IDS) {
    const entry = proficiency[id];
    if (!entry.evaluated) continue;
    weightedAccuracy += weights[id] * entry.accuracy;
    weightSum += weights[id];
  }

  return weightSum > 0 ? weightedAccuracy / weightSum : 0;
}
