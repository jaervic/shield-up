import { describe, expect, it } from 'vitest';
import {
  PASS_THRESHOLD,
  countDecisions,
  evaluateLesson,
  gradeStep,
} from '@/features/microlearning/engine/scoring';
import { makeDecisionStep, makeLesson, makeScenarioStep } from '../../helpers/lesson';

describe('gradeStep', () => {
  const single = makeDecisionStep({ answerType: 'single', correctOptionIds: ['c'] });
  const multiple = makeDecisionStep({ answerType: 'multiple', correctOptionIds: ['a', 'c'] });
  const scenario = makeScenarioStep();

  it('evalúa decisiones de respuesta única', () => {
    expect(gradeStep(single, ['c'])).toBe(true);
    expect(gradeStep(single, ['a'])).toBe(false);
    expect(gradeStep(single, [])).toBe(false);
  });

  it('exige el conjunto completo en decisiones múltiples', () => {
    expect(gradeStep(multiple, ['a', 'c'])).toBe(true);
    expect(gradeStep(multiple, ['c', 'a'])).toBe(true);
    expect(gradeStep(multiple, ['a'])).toBe(false);
    expect(gradeStep(multiple, ['a', 'b', 'c'])).toBe(false);
  });

  it('nunca evalúa un paso de escenario', () => {
    expect(gradeStep(scenario, ['a'])).toBe(false);
    expect(gradeStep(scenario, [])).toBe(false);
  });
});

describe('countDecisions', () => {
  it('cuenta solo los pasos evaluables', () => {
    const lesson = makeLesson({
      steps: [
        makeScenarioStep({ id: 's1' }),
        makeDecisionStep({ id: 's2' }),
        makeDecisionStep({ id: 's3' }),
      ],
    });

    expect(countDecisions(lesson)).toBe(2);
  });
});

describe('evaluateLesson', () => {
  const lesson = makeLesson({
    steps: [
      makeScenarioStep({ id: 's1' }),
      makeDecisionStep({ id: 's2', correctOptionIds: ['a'] }),
      makeDecisionStep({ id: 's3', correctOptionIds: ['b'] }),
    ],
  });

  it('cuenta las decisiones sin responder como fallo', () => {
    const evaluation = evaluateLesson(lesson, {});

    expect(evaluation.totalDecisions).toBe(2);
    expect(evaluation.correctDecisions).toBe(0);
    expect(evaluation.scorePercent).toBe(0);
    expect(evaluation.passed).toBe(false);
  });

  it('calcula el porcentaje sobre las decisiones, ignorando los escenarios', () => {
    const evaluation = evaluateLesson(lesson, { s2: ['a'] });

    expect(evaluation.correctDecisions).toBe(1);
    expect(evaluation.scorePercent).toBe(50);
    expect(evaluation.passed).toBe(false);
  });

  it('supera la lección al alcanzar el umbral', () => {
    const evaluation = evaluateLesson(lesson, { s2: ['a'], s3: ['b'] });

    expect(evaluation.scorePercent).toBe(100);
    expect(evaluation.passed).toBe(true);
  });

  it('el umbral está en el 80%', () => {
    expect(PASS_THRESHOLD).toBe(0.8);

    const four = makeLesson({
      steps: [
        makeDecisionStep({ id: 'a', correctOptionIds: ['a'] }),
        makeDecisionStep({ id: 'b', correctOptionIds: ['a'] }),
        makeDecisionStep({ id: 'c', correctOptionIds: ['a'] }),
        makeDecisionStep({ id: 'd', correctOptionIds: ['a'] }),
      ],
    });

    // 3 de 4 = 75% → no supera
    expect(
      evaluateLesson(four, { a: ['a'], b: ['a'], c: ['a'], d: ['b'] }).passed,
    ).toBe(false);

    const five = makeLesson({
      steps: [
        makeDecisionStep({ id: 'a', correctOptionIds: ['a'] }),
        makeDecisionStep({ id: 'b', correctOptionIds: ['a'] }),
        makeDecisionStep({ id: 'c', correctOptionIds: ['a'] }),
        makeDecisionStep({ id: 'd', correctOptionIds: ['a'] }),
        makeDecisionStep({ id: 'e', correctOptionIds: ['a'] }),
      ],
    });

    // 4 de 5 = 80% → supera
    const evaluation = evaluateLesson(five, {
      a: ['a'],
      b: ['a'],
      c: ['a'],
      d: ['a'],
      e: ['b'],
    });
    expect(evaluation.scorePercent).toBe(80);
    expect(evaluation.passed).toBe(true);
  });
});
