import { describe, expect, it } from 'vitest';
import type { AnswerRecord } from '@/domain/question';
import { evaluateAttempt, gradeAnswer } from '@/features/diagnostic/engine/scoring';
import { makeQuestion } from '../../helpers/question';

const NOW_ISO = '2026-03-01T10:00:00.000Z';

function answer(questionId: string, selectedOptionIds: string[]): AnswerRecord {
  return { questionId, selectedOptionIds, isCorrect: false, answeredAt: NOW_ISO };
}

describe('gradeAnswer', () => {
  const single = makeQuestion({ type: 'single', correctOptionIds: ['c'] });
  const multiple = makeQuestion({ type: 'multiple', correctOptionIds: ['a', 'c'] });

  it('acepta la opción correcta en preguntas de respuesta única', () => {
    expect(gradeAnswer(single, ['c'])).toBe(true);
    expect(gradeAnswer(single, ['a'])).toBe(false);
    expect(gradeAnswer(single, [])).toBe(false);
  });

  it('exige el conjunto completo en preguntas de respuesta múltiple', () => {
    expect(gradeAnswer(multiple, ['a', 'c'])).toBe(true);
    expect(gradeAnswer(multiple, ['c', 'a'])).toBe(true);
    expect(gradeAnswer(multiple, ['a'])).toBe(false);
    expect(gradeAnswer(multiple, ['a', 'b', 'c'])).toBe(false);
  });
});

describe('evaluateAttempt', () => {
  const questions = [
    makeQuestion({ id: 'd4-q01', domain: 4, correctOptionIds: ['a'] }),
    makeQuestion({ id: 'd1-q01', domain: 1, correctOptionIds: ['b'] }),
  ];

  it('cuenta las preguntas sin responder como fallo', () => {
    const attempt = evaluateAttempt(questions, [answer('d4-q01', ['a'])], {
      attemptId: 'diag_1',
      startedAt: NOW_ISO,
      completedAt: NOW_ISO,
    });

    expect(attempt.totalQuestions).toBe(2);
    expect(attempt.correctCount).toBe(1);
    expect(attempt.scorePercent).toBe(50);
    expect(attempt.answers).toHaveLength(2);
    expect(attempt.answers[1]?.selectedOptionIds).toEqual([]);
    expect(attempt.answers[1]?.isCorrect).toBe(false);
  });

  it('normaliza las respuestas en el orden de las preguntas', () => {
    const attempt = evaluateAttempt(
      questions,
      [answer('d1-q01', ['b']), answer('d4-q01', ['a'])],
      { attemptId: 'diag_2', startedAt: NOW_ISO, completedAt: NOW_ISO },
    );

    expect(attempt.answers.map((record) => record.questionId)).toEqual(['d4-q01', 'd1-q01']);
    expect(attempt.correctCount).toBe(2);
    expect(attempt.scorePercent).toBe(100);
  });

  it('pondera la preparación por el peso de cada dominio evaluado', () => {
    // D4 (28%) acertado, D1 (12%) fallado → 0.28 / 0.40 = 70%
    const attempt = evaluateAttempt(
      questions,
      [answer('d4-q01', ['a']), answer('d1-q01', ['a'])],
      { attemptId: 'diag_3', startedAt: NOW_ISO, completedAt: NOW_ISO },
    );

    expect(attempt.readinessPercent).toBe(70);
  });

  it('genera una ruta cuyo foco es el dominio no evaluado de mayor peso', () => {
    const attempt = evaluateAttempt(questions, [answer('d4-q01', ['a'])], {
      attemptId: 'diag_4',
      startedAt: NOW_ISO,
      completedAt: NOW_ISO,
    });

    // D2 no se evaluó y pesa 22%: es el mayor hueco ponderado.
    expect(attempt.route.focusDomain).toBe(2);
    expect(attempt.route.steps[0]?.domain).toBe(2);
  });

  it('devuelve 0 de preparación si no hay respuestas correctas', () => {
    const attempt = evaluateAttempt(questions, [], {
      attemptId: 'diag_5',
      startedAt: NOW_ISO,
      completedAt: NOW_ISO,
    });

    expect(attempt.correctCount).toBe(0);
    expect(attempt.readinessPercent).toBe(0);
  });
});
