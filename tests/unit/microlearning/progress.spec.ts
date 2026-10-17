import { describe, expect, it } from 'vitest';
import type { LessonProgress } from '@/domain/lesson';
import {
  completeProgress,
  createProgress,
  recordAnswer,
  resolveResumeIndex,
  summarizeByDomain,
} from '@/features/microlearning/engine/progress';
import { evaluateLesson } from '@/features/microlearning/engine/scoring';
import { makeDecisionStep, makeLesson, makeScenarioStep } from '../../helpers/lesson';

const NOW = new Date('2026-03-01T10:00:00.000Z');
const LATER = new Date('2026-03-01T10:05:00.000Z');

const lesson = makeLesson({
  id: 'd4-l1',
  domain: 4,
  steps: [
    makeScenarioStep({ id: 's1' }),
    makeDecisionStep({ id: 's2', correctOptionIds: ['a'] }),
    makeDecisionStep({ id: 's3', correctOptionIds: ['b'] }),
  ],
});

describe('createProgress', () => {
  it('arranca en el paso 0 y cuenta las decisiones de la lección', () => {
    const progress = createProgress(lesson, NOW);

    expect(progress).toMatchObject({
      lessonId: 'd4-l1',
      domain: 4,
      status: 'in-progress',
      currentStepIndex: 0,
      answers: {},
      correctDecisions: 0,
      totalDecisions: 2,
      scorePercent: 0,
      completedAt: null,
    });
    expect(progress.startedAt).toBe(NOW.toISOString());
    expect(progress.updatedAt).toBe(NOW.toISOString());
  });
});

describe('recordAnswer', () => {
  it('guarda la respuesta, recalcula el marcador y avanza el índice', () => {
    const progress = createProgress(lesson, NOW);
    const updated = recordAnswer(lesson, progress, 's2', ['a'], 2, LATER);

    expect(updated.answers.s2).toEqual(['a']);
    expect(updated.correctDecisions).toBe(1);
    expect(updated.scorePercent).toBe(50);
    expect(updated.currentStepIndex).toBe(2);
    expect(updated.updatedAt).toBe(LATER.toISOString());
  });

  it('no muta el progreso anterior', () => {
    const progress = createProgress(lesson, NOW);
    const snapshot = structuredClone(progress);

    recordAnswer(lesson, progress, 's2', ['a'], 2, LATER);

    expect(progress).toEqual(snapshot);
  });

  it('acota el índice al rango de la lección', () => {
    const progress = createProgress(lesson, NOW);
    const updated = recordAnswer(lesson, progress, 's3', ['b'], 99, LATER);

    expect(updated.currentStepIndex).toBe(lesson.steps.length - 1);
  });
});

describe('completeProgress', () => {
  it('marca la lección como completada con el resultado final', () => {
    const progress = recordAnswer(
      lesson,
      createProgress(lesson, NOW),
      's2',
      ['a'],
      1,
      LATER,
    );
    const evaluation = evaluateLesson(lesson, progress.answers);
    const completed = completeProgress(progress, evaluation, LATER);

    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBe(LATER.toISOString());
    expect(completed.currentStepIndex).toBe(0);
    expect(completed.scorePercent).toBe(50);
  });
});

describe('resolveResumeIndex', () => {
  it('devuelve 0 sin progreso previo', () => {
    expect(resolveResumeIndex(lesson, null)).toBe(0);
  });

  it('respeta el índice guardado y lo acota a los límites', () => {
    const base = createProgress(lesson, NOW);

    expect(resolveResumeIndex(lesson, { ...base, currentStepIndex: 2 })).toBe(2);
    expect(resolveResumeIndex(lesson, { ...base, currentStepIndex: 99 })).toBe(2);
    expect(resolveResumeIndex(lesson, { ...base, currentStepIndex: -5 })).toBe(0);
  });
});

describe('summarizeByDomain', () => {
  const lessons = [
    makeLesson({ id: 'd4-l1', domain: 4 }),
    makeLesson({ id: 'd4-l2', domain: 4 }),
    makeLesson({ id: 'd1-l1', domain: 1 }),
  ];

  function progress(
    lessonId: string,
    domain: LessonProgress['domain'],
    status: LessonProgress['status'],
    scorePercent: number,
  ): LessonProgress {
    return {
      lessonId,
      domain,
      status,
      currentStepIndex: 0,
      answers: {},
      correctDecisions: 0,
      totalDecisions: 2,
      scorePercent,
      startedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      completedAt: status === 'completed' ? NOW.toISOString() : null,
    };
  }

  it('cuenta superadas y en curso, y promedia las puntuaciones', () => {
    const summary = summarizeByDomain(lessons, {
      'd4-l1': progress('d4-l1', 4, 'completed', 100),
      'd4-l2': progress('d4-l2', 4, 'in-progress', 50),
    });

    expect(summary[4]).toMatchObject({ total: 2, completed: 1, inProgress: 1, averageScore: 100 });
    expect(summary[1]).toMatchObject({ total: 1, completed: 0, inProgress: 0, averageScore: null });
    expect(summary[5].total).toBe(0);
  });
});
