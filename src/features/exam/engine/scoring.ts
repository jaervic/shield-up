/**
 * Corrección del simulacro.
 *
 * Módulo PURO. Además del porcentaje de aciertos calcula la PUNTUACIÓN
 * ESCALADA sobre 900 con 750 como aprobado, que es como se comunica el
 * resultado del examen real: un 80% de aciertos no dice lo mismo que «780».
 */

import type { ExamAnswerRecord, ExamAttempt, ExamDomainResult } from '@/domain/exam';
import {
  EXAM_MAX_SCORE,
  EXAM_MIN_SCORE,
  EXAM_PASS_SCORE,
} from '@/domain/exam';
import { DOMAIN_IDS, type DomainId } from '@/domain/domain';
import type { Question } from '@/domain/question';
import { matchesCorrectSet } from '@/shared/utils/answer';

export interface ExamAnswerInput {
  questionId: string;
  selectedOptionIds: readonly string[];
  flagged: boolean;
  answeredAt: string;
}

export interface ExamMeta {
  attemptId: string;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
  elapsedSeconds: number;
  timeExpired: boolean;
}

/** Convierte los aciertos en la escala 100..900 del examen. */
export function scaledScore(correct: number, total: number): number {
  if (total <= 0) return EXAM_MIN_SCORE;
  const ratio = correct / total;
  return EXAM_MIN_SCORE + Math.round(ratio * (EXAM_MAX_SCORE - EXAM_MIN_SCORE));
}

export function isExamPassed(score: number): boolean {
  return score >= EXAM_PASS_SCORE;
}

export function evaluateExam(
  questions: readonly Question[],
  answers: readonly ExamAnswerInput[],
  meta: ExamMeta,
): ExamAttempt {
  const byId = new Map(answers.map((answer) => [answer.questionId, answer]));

  // Toda pregunta del examen tiene respuesta, aunque sea vacía.
  const records: ExamAnswerRecord[] = questions.map((question) => {
    const existing = byId.get(question.id);
    const selectedOptionIds = [...(existing?.selectedOptionIds ?? [])];

    return {
      questionId: question.id,
      selectedOptionIds,
      isCorrect: matchesCorrectSet(question.correctOptionIds, selectedOptionIds),
      answeredAt: existing?.answeredAt ?? meta.completedAt,
      flagged: existing?.flagged ?? false,
    };
  });

  const byDomain = {} as Record<DomainId, ExamDomainResult>;
  for (const id of DOMAIN_IDS) {
    byDomain[id] = { domain: id, asked: 0, correct: 0, accuracy: 0 };
  }

  for (const [index, record] of records.entries()) {
    const question = questions[index];
    if (question === undefined) continue;
    const entry = byDomain[question.domain];
    entry.asked += 1;
    if (record.isCorrect) entry.correct += 1;
  }

  for (const id of DOMAIN_IDS) {
    const entry = byDomain[id];
    entry.accuracy = entry.asked > 0 ? Math.round((entry.correct / entry.asked) * 100) / 100 : 0;
  }

  const correctCount = records.filter((record) => record.isCorrect).length;
  const totalQuestions = questions.length;
  const score = scaledScore(correctCount, totalQuestions);

  return {
    id: meta.attemptId,
    startedAt: meta.startedAt,
    completedAt: meta.completedAt,
    durationMinutes: meta.durationMinutes,
    elapsedSeconds: meta.elapsedSeconds,
    timeExpired: meta.timeExpired,
    questionIds: questions.map((question) => question.id),
    answers: records,
    totalQuestions,
    correctCount,
    scorePercent: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    scaledScore: score,
    passed: isExamPassed(score),
    byDomain,
  };
}

/** Preguntas marcadas para revisar, en el orden del examen. */
export function flaggedQuestions(attempt: ExamAttempt): ExamAnswerRecord[] {
  return attempt.answers.filter((answer) => answer.flagged);
}

/** Preguntas falladas, en el orden del examen. */
export function incorrectQuestions(attempt: ExamAttempt): ExamAnswerRecord[] {
  return attempt.answers.filter((answer) => !answer.isCorrect);
}
