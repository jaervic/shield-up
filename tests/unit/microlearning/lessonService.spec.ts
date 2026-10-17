import { afterEach, describe, expect, it } from 'vitest';
import type { StudyRoute } from '@/domain/diagnostic';
import {
  resetLessonRepository,
  setLessonRepository,
} from '@/features/microlearning/data/repository';
import {
  beginLesson,
  buildRecommendations,
  finishLesson,
  getLessonById,
  persistStepAnswer,
  restartLesson,
} from '@/features/microlearning/data/lessonService';
import { createProgress } from '@/features/microlearning/engine/progress';
import { createMemoryLessonRepository } from '../../helpers/memoryLessonRepository';

afterEach(() => {
  resetLessonRepository();
});

function requireLesson(id: string) {
  const lesson = getLessonById(id);
  if (!lesson) throw new Error(`La lección "${id}" no existe en el contenido.`);
  return lesson;
}

describe('beginLesson', () => {
  it('crea el progreso la primera vez y lo persiste', async () => {
    const repository = createMemoryLessonRepository();
    setLessonRepository(repository);

    const session = await beginLesson('d4-l1');

    expect(session.resumed).toBe(false);
    expect(session.stepIndex).toBe(0);
    expect(session.answers).toEqual({});
    expect(repository.rows['d4-l1']?.status).toBe('in-progress');
  });

  it('reanuda una lección a medias en el paso guardado', async () => {
    const lesson = requireLesson('d4-l1');
    const repository = createMemoryLessonRepository([
      { ...createProgress(lesson), currentStepIndex: 3, answers: { s2: ['a'] } },
    ]);
    setLessonRepository(repository);

    const session = await beginLesson('d4-l1');

    expect(session.resumed).toBe(true);
    expect(session.stepIndex).toBe(3);
    expect(session.answers).toEqual({ s2: ['a'] });
  });

  it('empieza de cero si la lección ya estaba superada', async () => {
    const lesson = requireLesson('d4-l1');
    const repository = createMemoryLessonRepository([
      { ...createProgress(lesson), status: 'completed', answers: { s2: ['a'] } },
    ]);
    setLessonRepository(repository);

    const session = await beginLesson('d4-l1');

    expect(session.resumed).toBe(false);
    expect(session.answers).toEqual({});
  });

  it('lanza un error si la lección no existe', async () => {
    setLessonRepository(createMemoryLessonRepository());
    await expect(beginLesson('no-existe')).rejects.toThrow(/no existe/i);
  });
});

describe('persistStepAnswer / finishLesson', () => {
  it('guarda cada respuesta y cierra la lección con el resultado', async () => {
    const lesson = requireLesson('d4-l1');
    const repository = createMemoryLessonRepository();
    setLessonRepository(repository);

    const session = await beginLesson('d4-l1');
    const afterStep = await persistStepAnswer(
      lesson,
      session.progress,
      's2',
      ['a'],
      1,
      new Date('2026-03-01T10:01:00.000Z'),
    );

    expect(repository.rows['d4-l1']?.answers.s2).toEqual(['a']);
    expect(afterStep.currentStepIndex).toBe(1);

    const { progress, evaluation } = await finishLesson(
      lesson,
      afterStep,
      new Date('2026-03-01T10:10:00.000Z'),
    );

    expect(progress.status).toBe('completed');
    expect(progress.completedAt).toBe('2026-03-01T10:10:00.000Z');
    expect(evaluation.totalDecisions).toBeGreaterThan(0);
    expect(repository.rows['d4-l1']?.status).toBe('completed');
  });
});

describe('restartLesson', () => {
  it('descarta el progreso anterior', async () => {
    const lesson = requireLesson('d4-l1');
    const repository = createMemoryLessonRepository([
      { ...createProgress(lesson), currentStepIndex: 2, answers: { s2: ['a'] } },
    ]);
    setLessonRepository(repository);

    const session = await restartLesson('d4-l1');

    expect(session.stepIndex).toBe(0);
    expect(session.answers).toEqual({});
    expect(repository.rows['d4-l1']?.answers).toEqual({});
  });
});

describe('buildRecommendations', () => {
  it('usa la ruta recibida para ordenar y refleja el progreso', async () => {
    const lesson = requireLesson('d4-l1');
    const repository = createMemoryLessonRepository([
      {
        ...createProgress(lesson),
        status: 'completed',
        scorePercent: 100,
        completedAt: '2026-03-01T10:00:00.000Z',
      },
    ]);
    setLessonRepository(repository);

    const route: StudyRoute = {
      generatedAt: '2026-03-01T10:00:00.000Z',
      focusDomain: 2,
      steps: [
        { domain: 2, gap: 1, priority: 0.22, reason: 'D2 primero', estimatedCards: 30 },
        { domain: 4, gap: 0.5, priority: 0.14, reason: 'D4 después', estimatedCards: 15 },
      ],
    };

    const recommendations = await buildRecommendations(route, 20);

    expect(recommendations[0]?.domain).toBe(2);
    const done = recommendations.find((item) => item.lessonId === 'd4-l1');
    expect(done?.completed).toBe(true);
  });
});
