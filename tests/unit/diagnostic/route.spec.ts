import { describe, expect, it } from 'vitest';
import type { AnswerRecord } from '@/domain/question';
import { computeProficiency, computeReadiness } from '@/features/diagnostic/engine/proficiency';
import { CARDS_PER_GAP_UNIT, buildStudyRoute } from '@/features/diagnostic/engine/route';
import { makeQuestion } from '../../helpers/question';

function answer(questionId: string, isCorrect: boolean): AnswerRecord {
  return {
    questionId,
    selectedOptionIds: isCorrect ? ['a'] : [],
    isCorrect,
    answeredAt: '2026-03-01T10:00:00.000Z',
  };
}

describe('computeProficiency', () => {
  const questions = [
    makeQuestion({ id: 'd4-a', domain: 4 }),
    makeQuestion({ id: 'd4-b', domain: 4 }),
    makeQuestion({ id: 'd1-a', domain: 1 }),
  ];

  it('agrupa aciertos y calcula la precisión por dominio', () => {
    const proficiency = computeProficiency(questions, [
      answer('d4-a', true),
      answer('d4-b', false),
      answer('d1-a', true),
    ]);

    expect(proficiency[4]).toMatchObject({ asked: 2, correct: 1, accuracy: 0.5, evaluated: true });
    expect(proficiency[1]).toMatchObject({ asked: 1, correct: 1, accuracy: 1, evaluated: true });
    expect(proficiency[2]).toMatchObject({ asked: 0, correct: 0, accuracy: 0, evaluated: false });
  });
});

describe('computeReadiness', () => {
  it('renormaliza sobre los dominios evaluados', () => {
    const questions = [makeQuestion({ id: 'd4-a', domain: 4 })];
    const proficiency = computeProficiency(questions, [answer('d4-a', true)]);

    // Solo D4 evaluado con 100% → readiness 1, no 0.28.
    expect(computeReadiness(proficiency)).toBe(1);
  });

  it('devuelve 0 si no se evaluó ningún dominio', () => {
    const proficiency = computeProficiency([], []);
    expect(computeReadiness(proficiency)).toBe(0);
  });
});

describe('buildStudyRoute', () => {
  const questions = [
    makeQuestion({ id: 'd4-a', domain: 4 }),
    makeQuestion({ id: 'd1-a', domain: 1 }),
  ];

  const proficiency = computeProficiency(questions, [
    answer('d4-a', true), // D4 al 100% → sin hueco
    answer('d1-a', false), // D1 al 0% → hueco total
  ]);

  it('ordena por prioridad descendente (peso × hueco)', () => {
    const route = buildStudyRoute(proficiency, new Date('2026-03-01T10:00:00.000Z'));

    const priorities = route.steps.map((step) => step.priority);
    expect([...priorities].sort((a, b) => b - a)).toEqual(priorities);
    expect(route.steps).toHaveLength(5);
  });

  it('asigna hueco completo a los dominios no evaluados', () => {
    const route = buildStudyRoute(proficiency);
    const step = route.steps.find((candidate) => candidate.domain === 2);

    expect(step?.gap).toBe(1);
    expect(step?.priority).toBeCloseTo(0.22, 5);
    expect(step?.reason).toMatch(/sin evaluar/i);
  });

  it('el foco es el dominio con mayor prioridad', () => {
    const route = buildStudyRoute(proficiency);
    expect(route.focusDomain).toBe(route.steps[0]?.domain);
    expect(route.focusDomain).toBe(2);
  });

  it('sugiere más tarjetas cuanto mayor es el hueco', () => {
    const route = buildStudyRoute(proficiency);
    const weak = route.steps.find((step) => step.domain === 1);
    const strong = route.steps.find((step) => step.domain === 4);

    expect(weak?.estimatedCards).toBe(CARDS_PER_GAP_UNIT);
    expect(strong?.estimatedCards).toBe(0);
  });

  it('describe el rendimiento de los dominios evaluados', () => {
    const route = buildStudyRoute(proficiency);
    const weak = route.steps.find((step) => step.domain === 1);
    const strong = route.steps.find((step) => step.domain === 4);

    expect(weak?.reason).toMatch(/0% de aciertos/);
    expect(strong?.reason).toMatch(/100% de aciertos/);
  });
});
