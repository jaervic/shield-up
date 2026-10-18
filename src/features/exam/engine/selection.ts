/**
 * Selección de las preguntas del simulacro.
 *
 * Reparte el banco entre los cinco dominios en proporción a su peso oficial,
 * igual que hace el diagnóstico, y las intercala para no agruparlas por bloque.
 */

import { DOMAIN_IDS, DOMAIN_WEIGHTS, type DomainId } from '@/domain/domain';
import type { Question } from '@/domain/question';
import { interleaveByDomain } from '@/shared/utils/interleave';
import { allocateQuotas } from '@/shared/utils/quota';
import { createRng, shuffle } from '@/shared/utils/random';
import {
  EXAM_DURATION_MINUTES,
  EXAM_MAX_QUESTIONS,
  MINUTES_PER_QUESTION,
} from '@/domain/exam';

export interface ExamSelectionOptions {
  count?: number;
  seed?: number;
  weights?: Readonly<Record<DomainId, number>>;
}

/** Longitud del simulacro: todo el banco, sin pasar del máximo del examen real. */
export function examLengthFor(bankSize: number): number {
  return Math.max(1, Math.min(EXAM_MAX_QUESTIONS, bankSize));
}

/**
 * ¿El banco permite un simulacro a escala real?
 *
 * Se admite un 10% de margen: con 89 de 90 preguntas el examen ya es
 * equivalente y avisar de que «es proporcional» sería ruido.
 */
export function isFullLengthExam(bankSize: number): boolean {
  return bankSize >= EXAM_MAX_QUESTIONS * 0.9;
}

/** Duración proporcional al número de preguntas, con el techo de 90 minutos. */
export function examDurationMinutes(questionCount: number): number {
  if (questionCount <= 0) return 0;
  const scaled = Math.round(questionCount * MINUTES_PER_QUESTION);
  return Math.min(EXAM_DURATION_MINUTES, Math.max(10, scaled));
}

export function buildExamQuestions(
  questions: readonly Question[],
  options: ExamSelectionOptions = {},
): Question[] {
  const requested = options.count ?? examLengthFor(questions.length);
  const target = Math.max(1, Math.min(requested, questions.length));
  const seed = options.seed ?? 1;
  const weights = options.weights ?? DOMAIN_WEIGHTS;
  const rng = createRng(seed);

  const byDomain = new Map<DomainId, Question[]>();
  for (const id of DOMAIN_IDS) byDomain.set(id, []);
  for (const question of questions) byDomain.get(question.domain)?.push(question);

  const poolSizes = {} as Record<DomainId, number>;
  for (const id of DOMAIN_IDS) poolSizes[id] = byDomain.get(id)?.length ?? 0;

  const quotas = allocateQuotas(poolSizes, target, weights);

  const selected: Question[] = [];
  for (const id of DOMAIN_IDS) {
    const pool = byDomain.get(id) ?? [];
    selected.push(...shuffle(pool, rng).slice(0, quotas[id]));
  }

  return interleaveByDomain(selected, weights);
}
