import { describe, expect, it } from 'vitest';
import { DOMAIN_IDS } from '@/domain/domain';
import { loadQuestions } from '@/data/content/loadQuestions';

describe('banco de preguntas', () => {
  const questions = loadQuestions();

  it('carga sin errores de validación', () => {
    expect(questions.length).toBeGreaterThanOrEqual(40);
  });

  it('no contiene IDs duplicados', () => {
    const ids = questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cubre los cinco dominios del examen', () => {
    const covered = new Set(questions.map((question) => question.domain));
    for (const domain of DOMAIN_IDS) {
      expect(covered.has(domain)).toBe(true);
    }
  });

  it('tiene preguntas suficientes por dominio para el test de 25', () => {
    const countByDomain = questions.reduce<Record<number, number>>((acc, question) => {
      acc[question.domain] = (acc[question.domain] ?? 0) + 1;
      return acc;
    }, {});

    for (const domain of DOMAIN_IDS) {
      expect(countByDomain[domain] ?? 0).toBeGreaterThanOrEqual(5);
    }
  });

  it('cada pregunta tiene una explicación y opciones suficientes', () => {
    for (const question of questions) {
      expect(question.explanation.length).toBeGreaterThan(10);
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.correctOptionIds.length).toBeGreaterThanOrEqual(1);
    }
  });
});
