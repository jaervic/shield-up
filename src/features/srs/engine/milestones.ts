/**
 * Hitos de estudio.
 *
 * Módulo PURO. Se derivan de datos que ya existen (repasos, racha, tarjetas
 * consolidadas, lecciones y diagnóstico): no se guarda estado adicional ni se
 * inventa una tabla de logros. Ver progreso concreto es lo que sostiene el
 * hábito, que es lo que hace funcionar la repetición espaciada.
 */

export interface MilestoneInput {
  totalReviews: number;
  currentStreak: number;
  matureCards: number;
  completedLessons: number;
  readinessPercent: number | null;
}

export interface Milestone {
  id: string;
  label: string;
  /** Descripción corta de qué hace falta. */
  detail: string;
  achieved: boolean;
  /** 0..1 hacia el objetivo. */
  progress: number;
}

interface MilestoneDefinition {
  id: string;
  label: string;
  detail: string;
  target: number;
  /** Valor actual, o null si aún no es medible. */
  current: (input: MilestoneInput) => number | null;
}

const DEFINITIONS: readonly MilestoneDefinition[] = [
  {
    id: 'first-review',
    label: 'Primer repaso',
    detail: 'Repasa tu primera tarjeta',
    target: 1,
    current: (input) => input.totalReviews,
  },
  {
    id: 'streak-7',
    label: 'Racha de 7 días',
    detail: 'Estudia siete días seguidos',
    target: 7,
    current: (input) => input.currentStreak,
  },
  {
    id: 'cards-100',
    label: '100 consolidadas',
    detail: 'Lleva 100 tarjetas a memoria duradera',
    target: 100,
    current: (input) => input.matureCards,
  },
  {
    id: 'lessons-5',
    label: '5 lecciones',
    detail: 'Supera cinco lecciones',
    target: 5,
    current: (input) => input.completedLessons,
  },
  {
    id: 'readiness-70',
    label: '70% de preparación',
    detail: 'Alcanza el 70% en el diagnóstico',
    target: 70,
    current: (input) => input.readinessPercent,
  },
];

export function computeMilestones(input: MilestoneInput): Milestone[] {
  return DEFINITIONS.map((definition) => {
    const current = definition.current(input);
    const value = current ?? 0;
    const progress = Math.min(1, Math.max(0, value / definition.target));

    return {
      id: definition.id,
      label: definition.label,
      detail: definition.detail,
      achieved: current !== null && value >= definition.target,
      progress: Math.round(progress * 100) / 100,
    };
  });
}
