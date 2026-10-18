import { describe, expect, it } from 'vitest';
import { computeMilestones, type MilestoneInput } from '@/features/srs/engine/milestones';

const EMPTY: MilestoneInput = {
  totalReviews: 0,
  currentStreak: 0,
  matureCards: 0,
  completedLessons: 0,
  readinessPercent: null,
};

describe('computeMilestones', () => {
  it('sin actividad, todos los hitos están pendientes', () => {
    const milestones = computeMilestones(EMPTY);

    expect(milestones).toHaveLength(5);
    expect(milestones.every((milestone) => !milestone.achieved)).toBe(true);
    expect(milestones.every((milestone) => milestone.progress === 0)).toBe(true);
  });

  it('marca como conseguidos los hitos alcanzados', () => {
    const milestones = computeMilestones({
      ...EMPTY,
      totalReviews: 12,
      currentStreak: 7,
      matureCards: 100,
      completedLessons: 5,
      readinessPercent: 72,
    });

    expect(milestones.every((milestone) => milestone.achieved)).toBe(true);
    expect(milestones.every((milestone) => milestone.progress === 1)).toBe(true);
  });

  it('calcula el progreso parcial de forma proporcional', () => {
    const milestones = computeMilestones({
      ...EMPTY,
      totalReviews: 1,
      currentStreak: 3,
      matureCards: 50,
      completedLessons: 2,
      readinessPercent: 35,
    });

    const byId = new Map(milestones.map((milestone) => [milestone.id, milestone]));

    expect(byId.get('first-review')?.achieved).toBe(true);
    expect(byId.get('streak-7')?.progress).toBeCloseTo(3 / 7, 2);
    expect(byId.get('cards-100')?.progress).toBe(0.5);
    expect(byId.get('lessons-5')?.progress).toBe(0.4);
    expect(byId.get('readiness-70')?.progress).toBe(0.5);
  });

  it('el hito del diagnóstico queda pendiente si no hay test hecho', () => {
    const milestones = computeMilestones({ ...EMPTY, readinessPercent: null });
    const readiness = milestones.find((milestone) => milestone.id === 'readiness-70');

    expect(readiness?.achieved).toBe(false);
    expect(readiness?.progress).toBe(0);
  });

  it('nunca supera el 100% aunque el valor exceda el objetivo', () => {
    const milestones = computeMilestones({ ...EMPTY, totalReviews: 999, matureCards: 5000 });

    expect(milestones.every((milestone) => milestone.progress <= 1)).toBe(true);
  });

  it('cada hito tiene etiqueta y detalle legibles', () => {
    for (const milestone of computeMilestones(EMPTY)) {
      expect(milestone.label.length).toBeGreaterThan(3);
      expect(milestone.detail.length).toBeGreaterThan(10);
      expect(milestone.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
