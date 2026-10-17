import { describe, expect, it } from 'vitest';
import { DOMAIN_IDS } from '@/domain/domain';
import { isDecisionStep } from '@/domain/lesson';
import { loadLessons } from '@/data/content/loadLessons';

describe('contenido de lecciones', () => {
  const lessons = loadLessons();

  it('carga sin errores de validación', () => {
    expect(lessons.length).toBeGreaterThanOrEqual(8);
  });

  it('no contiene IDs duplicados', () => {
    const ids = lessons.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cubre los cinco dominios del examen', () => {
    const covered = new Set(lessons.map((lesson) => lesson.domain));
    for (const domain of DOMAIN_IDS) {
      expect(covered.has(domain)).toBe(true);
    }
  });

  it('cada lección tiene al menos una decisión evaluable', () => {
    for (const lesson of lessons) {
      expect(lesson.steps.some(isDecisionStep)).toBe(true);
    }
  });

  it('los ids de paso son únicos dentro de cada lección', () => {
    for (const lesson of lessons) {
      const ids = lesson.steps.map((step) => step.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('declara objetivos, duración y resumen coherentes', () => {
    for (const lesson of lessons) {
      expect(lesson.objectives.length).toBeGreaterThanOrEqual(1);
      expect(lesson.estimatedMinutes).toBeGreaterThan(0);
      expect(lesson.estimatedMinutes).toBeLessThanOrEqual(30);
      expect(lesson.summary.length).toBeGreaterThan(20);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('todas las decisiones tienen explicación e idea clave', () => {
    for (const lesson of lessons) {
      for (const step of lesson.steps.filter(isDecisionStep)) {
        expect(step.explanation.length).toBeGreaterThan(20);
        expect(step.takeaway?.length ?? 0).toBeGreaterThan(10);
      }
    }
  });
});
