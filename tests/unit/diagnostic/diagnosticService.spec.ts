import { afterEach, describe, expect, it } from 'vitest';
import type { AnswerRecord } from '@/domain/question';
import {
  buildDiagnosticQuestions,
  finalizeDiagnostic,
  getDiagnosticHistory,
  getLatestDiagnostic,
} from '@/features/diagnostic/data/diagnosticService';
import {
  resetDiagnosticRepository,
  setDiagnosticRepository,
} from '@/features/diagnostic/data/repository';
import { makeQuestion } from '../../helpers/question';
import { createMemoryDiagnosticRepository } from '../../helpers/memoryDiagnosticRepository';

afterEach(() => {
  resetDiagnosticRepository();
});

describe('buildDiagnosticQuestions', () => {
  it('selecciona preguntas reales del banco', () => {
    const questions = buildDiagnosticQuestions({ count: 10 });

    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((question) => question.id)).size).toBe(10);
  });
});

describe('finalizeDiagnostic', () => {
  const questions = [
    makeQuestion({ id: 'd4-q01', domain: 4, correctOptionIds: ['a'] }),
    makeQuestion({ id: 'd2-q01', domain: 2, correctOptionIds: ['b'] }),
  ];

  const answers: AnswerRecord[] = [
    { questionId: 'd4-q01', selectedOptionIds: ['a'], isCorrect: false, answeredAt: '2026-03-01T10:05:00.000Z' },
    { questionId: 'd2-q01', selectedOptionIds: ['a'], isCorrect: false, answeredAt: '2026-03-01T10:06:00.000Z' },
  ];

  it('evalúa y persiste el intento', async () => {
    const repository = createMemoryDiagnosticRepository();
    setDiagnosticRepository(repository);

    const attempt = await finalizeDiagnostic({
      questions,
      answers,
      startedAt: '2026-03-01T10:00:00.000Z',
      completedAt: '2026-03-01T10:10:00.000Z',
    });

    expect(attempt.correctCount).toBe(1);
    expect(attempt.scorePercent).toBe(50);
    expect(repository.attempts).toHaveLength(1);
    expect(repository.attempts[0]?.id).toBe(attempt.id);
  });

  it('recupera el intento más reciente del historial', async () => {
    const repository = createMemoryDiagnosticRepository();
    setDiagnosticRepository(repository);

    await finalizeDiagnostic({
      questions,
      answers,
      startedAt: '2026-03-01T10:00:00.000Z',
      completedAt: '2026-03-01T10:10:00.000Z',
      attemptId: 'diag_old',
    });

    await finalizeDiagnostic({
      questions,
      answers,
      startedAt: '2026-04-01T10:00:00.000Z',
      completedAt: '2026-04-01T10:10:00.000Z',
      attemptId: 'diag_new',
    });

    const latest = await getLatestDiagnostic();
    const history = await getDiagnosticHistory();

    expect(latest?.id).toBe('diag_new');
    expect(history).toHaveLength(2);
    expect(history[0]?.id).toBe('diag_new');
  });

  it('devuelve null cuando no hay intentos', async () => {
    setDiagnosticRepository(createMemoryDiagnosticRepository());
    expect(await getLatestDiagnostic()).toBeNull();
  });
});
