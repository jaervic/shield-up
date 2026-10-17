import type { DecisionStep, Lesson, ScenarioStep } from '@/domain/lesson';

export function makeScenarioStep(overrides: Partial<ScenarioStep> = {}): ScenarioStep {
  return {
    id: overrides.id ?? 's-scenario',
    kind: 'scenario',
    title: overrides.title ?? 'Escenario',
    prompt: overrides.prompt ?? '¿Qué está pasando aquí?',
    explanation: overrides.explanation ?? 'Explicación del escenario.',
    ...(overrides.takeaway !== undefined ? { takeaway: overrides.takeaway } : {}),
  };
}

export function makeDecisionStep(overrides: Partial<DecisionStep> = {}): DecisionStep {
  return {
    id: overrides.id ?? 's-decision',
    kind: 'decision',
    title: overrides.title ?? 'Decide',
    prompt: overrides.prompt ?? '¿Qué haces?',
    explanation: overrides.explanation ?? 'Explicación de la decisión.',
    ...(overrides.takeaway !== undefined ? { takeaway: overrides.takeaway } : {}),
    answerType: overrides.answerType ?? 'single',
    options: overrides.options ?? [
      { id: 'a', text: 'Opción A' },
      { id: 'b', text: 'Opción B' },
    ],
    correctOptionIds: overrides.correctOptionIds ?? ['a'],
  };
}

export function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: overrides.id ?? 'd4-l1',
    domain: overrides.domain ?? 4,
    objectives: overrides.objectives ?? ['4.8'],
    title: overrides.title ?? 'Lección de prueba',
    summary: overrides.summary ?? 'Resumen de la lección.',
    estimatedMinutes: overrides.estimatedMinutes ?? 5,
    difficulty: overrides.difficulty ?? 'medium',
    tags: overrides.tags ?? [],
    steps: overrides.steps ?? [
      makeScenarioStep({ id: 's1' }),
      makeDecisionStep({ id: 's2' }),
      makeDecisionStep({ id: 's3' }),
    ],
  };
}
