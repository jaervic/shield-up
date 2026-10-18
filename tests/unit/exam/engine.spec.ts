import { describe, expect, it } from 'vitest';
import { DOMAIN_WEIGHTS } from '@/domain/domain';
import { EXAM_MAX_SCORE, EXAM_MIN_SCORE, EXAM_PASS_SCORE } from '@/domain/exam';
import type { Question } from '@/domain/question';
import { loadQuestions } from '@/data/content/loadQuestions';
import {
  buildExamQuestions,
  examDurationMinutes,
  examLengthFor,
} from '@/features/exam/engine/selection';
import { evaluateExam, isExamPassed, scaledScore } from '@/features/exam/engine/scoring';
import { examTimerState, formatClock, isTimeRunningOut } from '@/features/exam/engine/timer';
import { makeQuestion } from '../../helpers/question';

const META = {
  attemptId: 'exam_1',
  startedAt: '2026-03-01T10:00:00.000Z',
  completedAt: '2026-03-01T11:00:00.000Z',
  durationMinutes: 60,
  elapsedSeconds: 3600,
  timeExpired: false,
};

describe('examLengthFor / examDurationMinutes', () => {
  it('usa todo el banco sin pasar de 90 preguntas', () => {
    expect(examLengthFor(41)).toBe(41);
    expect(examLengthFor(90)).toBe(90);
    expect(examLengthFor(500)).toBe(90);
  });

  it('nunca devuelve cero', () => {
    expect(examLengthFor(0)).toBe(1);
  });

  it('escala la duración y la topa en 90 minutos', () => {
    expect(examDurationMinutes(41)).toBe(62);
    expect(examDurationMinutes(90)).toBe(90);
    expect(examDurationMinutes(100)).toBe(90);
  });

  it('da un mínimo razonable para exámenes muy cortos', () => {
    expect(examDurationMinutes(1)).toBe(10);
    expect(examDurationMinutes(0)).toBe(0);
  });
});

describe('buildExamQuestions', () => {
  const bank = loadQuestions();

  it('selecciona todo el banco disponible por defecto', () => {
    expect(buildExamQuestions(bank)).toHaveLength(examLengthFor(bank.length));
  });

  it('no repite preguntas', () => {
    const exam = buildExamQuestions(bank, { count: 30 });
    expect(new Set(exam.map((question) => question.id)).size).toBe(30);
  });

  it('respeta el reparto por peso del examen', () => {
    const exam = buildExamQuestions(bank, { count: 30 });
    const byDomain = exam.reduce<Record<number, number>>((acc, question) => {
      acc[question.domain] = (acc[question.domain] ?? 0) + 1;
      return acc;
    }, {});

    // D4 pesa 28% y D1 12%: el reparto debe reflejarlo.
    expect(byDomain[4] ?? 0).toBeGreaterThan(byDomain[1] ?? 0);
  });

  it('es determinista con la misma semilla', () => {
    const a = buildExamQuestions(bank, { count: 20, seed: 7 });
    const b = buildExamQuestions(bank, { count: 20, seed: 7 });

    expect(a.map((question) => question.id)).toEqual(b.map((question) => question.id));
  });

  it('se limita al tamaño del banco', () => {
    const small = [makeQuestion({ id: 'a', domain: 1 }), makeQuestion({ id: 'b', domain: 2 })];
    expect(buildExamQuestions(small, { count: 90 })).toHaveLength(2);
  });

  it('el reparto suma el total seleccionado', () => {
    const exam = buildExamQuestions(bank, { count: 25 });
    expect(exam).toHaveLength(25);
    // El peso de los dominios se usa como referencia del reparto.
    expect(Object.keys(DOMAIN_WEIGHTS)).toHaveLength(5);
  });
});

describe('scaledScore', () => {
  it('va de 100 a 900', () => {
    expect(scaledScore(0, 40)).toBe(EXAM_MIN_SCORE);
    expect(scaledScore(40, 40)).toBe(EXAM_MAX_SCORE);
  });

  it('750 es el aprobado, que equivale a un 81,25% de aciertos', () => {
    // 32,5 de 40 → el primer entero que aprueba es 33 (82,5%)
    expect(scaledScore(32, 40)).toBeLessThan(EXAM_PASS_SCORE);
    expect(scaledScore(33, 40)).toBeGreaterThanOrEqual(EXAM_PASS_SCORE);
    expect(isExamPassed(EXAM_PASS_SCORE)).toBe(true);
    expect(isExamPassed(EXAM_PASS_SCORE - 1)).toBe(false);
  });

  it('sin preguntas devuelve el mínimo', () => {
    expect(scaledScore(0, 0)).toBe(EXAM_MIN_SCORE);
  });
});

describe('evaluateExam', () => {
  const questions: Question[] = [
    makeQuestion({ id: 'd4-a', domain: 4, correctOptionIds: ['a'] }),
    makeQuestion({ id: 'd4-b', domain: 4, correctOptionIds: ['b'] }),
    makeQuestion({ id: 'd1-a', domain: 1, correctOptionIds: ['a'] }),
  ];

  const answered = (questionId: string, selectedOptionIds: string[], flagged = false) => ({
    questionId,
    selectedOptionIds,
    flagged,
    answeredAt: META.completedAt,
  });

  it('cuenta las no respondidas como fallo y normaliza el orden', () => {
    const attempt = evaluateExam(questions, [answered('d1-a', ['a'])], META);

    expect(attempt.totalQuestions).toBe(3);
    expect(attempt.correctCount).toBe(1);
    expect(attempt.answers.map((answer) => answer.questionId)).toEqual([
      'd4-a',
      'd4-b',
      'd1-a',
    ]);
    expect(attempt.answers[0]?.selectedOptionIds).toEqual([]);
  });

  it('calcula la puntuación escalada y el aprobado', () => {
    const all = evaluateExam(
      questions,
      [answered('d4-a', ['a']), answered('d4-b', ['b']), answered('d1-a', ['a'])],
      META,
    );

    expect(all.scaledScore).toBe(EXAM_MAX_SCORE);
    expect(all.passed).toBe(true);

    const none = evaluateExam(questions, [], META);
    expect(none.scaledScore).toBe(EXAM_MIN_SCORE);
    expect(none.passed).toBe(false);
  });

  it('agrupa los resultados por dominio', () => {
    const attempt = evaluateExam(
      questions,
      [answered('d4-a', ['a']), answered('d4-b', ['a'])],
      META,
    );

    expect(attempt.byDomain[4]).toMatchObject({ asked: 2, correct: 1, accuracy: 0.5 });
    expect(attempt.byDomain[1]).toMatchObject({ asked: 1, correct: 0, accuracy: 0 });
    expect(attempt.byDomain[2]).toMatchObject({ asked: 0, accuracy: 0 });
  });

  it('conserva las marcas para revisar', () => {
    const attempt = evaluateExam(questions, [answered('d4-b', ['b'], true)], META);

    expect(attempt.answers.filter((answer) => answer.flagged)).toHaveLength(1);
    expect(attempt.answers[1]?.flagged).toBe(true);
  });

  it('registra el tiempo y si se agotó', () => {
    const attempt = evaluateExam(questions, [], { ...META, timeExpired: true, elapsedSeconds: 3600 });

    expect(attempt.timeExpired).toBe(true);
    expect(attempt.elapsedSeconds).toBe(3600);
    expect(attempt.durationMinutes).toBe(60);
  });
});

describe('cronómetro', () => {
  const START = '2026-03-01T10:00:00.000Z';

  it('calcula lo transcurrido y lo que queda', () => {
    const state = examTimerState(START, 60, new Date('2026-03-01T10:10:00.000Z'));

    expect(state.elapsedSeconds).toBe(600);
    expect(state.remainingSeconds).toBe(3000);
    expect(state.expired).toBe(false);
  });

  it('marca el tiempo agotado y no baja de cero', () => {
    const state = examTimerState(START, 60, new Date('2026-03-01T12:00:00.000Z'));

    expect(state.remainingSeconds).toBe(0);
    expect(state.elapsedSeconds).toBe(3600);
    expect(state.expired).toBe(true);
  });

  it('no se desvía si el reloj retrocede', () => {
    const state = examTimerState(START, 60, new Date('2026-03-01T09:50:00.000Z'));
    expect(state.elapsedSeconds).toBe(0);
  });

  it('formatea el reloj en MM:SS y HH:MM:SS', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(59)).toBe('00:59');
    expect(formatClock(600)).toBe('10:00');
    expect(formatClock(3661)).toBe('01:01:01');
    expect(formatClock(-5)).toBe('00:00');
  });

  it('avisa cuando queda poco tiempo', () => {
    expect(isTimeRunningOut(300)).toBe(true);
    expect(isTimeRunningOut(301)).toBe(false);
    expect(isTimeRunningOut(0)).toBe(false);
  });
});
