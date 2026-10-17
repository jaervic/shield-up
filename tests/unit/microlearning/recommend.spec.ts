import { describe, expect, it } from 'vitest';
import type { StudyRoute } from '@/domain/diagnostic';
import type { LessonProgress } from '@/domain/lesson';
import { recommendLessons } from '@/features/microlearning/engine/recommend';
import { makeLesson } from '../../helpers/lesson';

const NOW = '2026-03-01T10:00:00.000Z';

/** Ruta con D4 como foco (28%), seguido de D2 (22%). */
const route: StudyRoute = {
  generatedAt: NOW,
  focusDomain: 4,
  steps: [
    { domain: 4, gap: 1, priority: 0.28, reason: 'D4: base débil', estimatedCards: 30 },
    { domain: 2, gap: 1, priority: 0.22, reason: 'D2: necesita refuerzo', estimatedCards: 30 },
    { domain: 3, gap: 1, priority: 0.18, reason: 'D3: sin evaluar', estimatedCards: 30 },
    { domain: 5, gap: 1, priority: 0.2, reason: 'D5: sin evaluar', estimatedCards: 30 },
    { domain: 1, gap: 1, priority: 0.12, reason: 'D1: refuerzo ligero', estimatedCards: 30 },
  ],
};

function completed(lessonId: string, domain: LessonProgress['domain'], score: number): LessonProgress {
  return {
    lessonId,
    domain,
    status: 'completed',
    currentStepIndex: 0,
    answers: {},
    correctDecisions: 2,
    totalDecisions: 2,
    scorePercent: score,
    startedAt: NOW,
    updatedAt: NOW,
    completedAt: NOW,
  };
}

const lessons = [
  makeLesson({ id: 'd1-l1', domain: 1, title: 'Lección D1' }),
  makeLesson({ id: 'd2-l1', domain: 2, title: 'Lección D2' }),
  makeLesson({ id: 'd4-l1', domain: 4, title: 'Lección D4' }),
  makeLesson({ id: 'd5-l1', domain: 5, title: 'Lección D5' }),
];

describe('recommendLessons', () => {
  it('prioriza las lecciones del dominio con mayor prioridad en la ruta', () => {
    const recommendations = recommendLessons(lessons, {}, route, 4);

    expect(recommendations[0]?.lessonId).toBe('d4-l1');
    expect(recommendations[0]?.domain).toBe(4);
    expect(recommendations[0]?.reason).toBe('D4: base débil');
  });

  it('baja las lecciones ya superadas por debajo de las pendientes', () => {
    const progress = { 'd4-l1': completed('d4-l1', 4, 100) };

    const recommendations = recommendLessons(lessons, progress, route, 4);

    // D4 superada (0.28 × 0.2 = 0.056) queda por debajo de D2 (0.22).
    expect(recommendations[0]?.lessonId).toBe('d2-l1');
    const done = recommendations.find((item) => item.lessonId === 'd4-l1');
    expect(done?.completed).toBe(true);
    expect(done?.reason).toMatch(/superaste con 100%/i);
  });

  it('respeta el límite solicitado', () => {
    expect(recommendLessons(lessons, {}, route, 2)).toHaveLength(2);
    expect(recommendLessons(lessons, {}, route, 0)).toHaveLength(0);
  });

  it('sin ruta usa los pesos del examen como prioridad', () => {
    const recommendations = recommendLessons(lessons, {}, null, 4);

    expect(recommendations[0]?.domain).toBe(4);
    expect(recommendations[0]?.reason).toMatch(/sin diagnóstico/i);
    expect(recommendations[recommendations.length - 1]?.domain).toBe(1);
  });

  it('expone los datos que necesita la interfaz', () => {
    const recommendations = recommendLessons(lessons, {}, route, 1);
    const [first] = recommendations;

    expect(first).toMatchObject({
      lessonId: 'd4-l1',
      title: 'Lección D4',
      completed: false,
      scorePercent: null,
    });
    expect(first?.estimatedMinutes).toBeGreaterThan(0);
  });
});
