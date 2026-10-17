import type { Question } from '@/domain/question';

export function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: overrides.id ?? 'd1-q01',
    domain: overrides.domain ?? 1,
    objective: overrides.objective ?? '1.1',
    type: overrides.type ?? 'single',
    stem: overrides.stem ?? '¿Pregunta de prueba?',
    options: overrides.options ?? [
      { id: 'a', text: 'Opción A' },
      { id: 'b', text: 'Opción B' },
    ],
    correctOptionIds: overrides.correctOptionIds ?? ['a'],
    explanation: overrides.explanation ?? 'Explicación de prueba.',
    difficulty: overrides.difficulty ?? 'medium',
    tags: overrides.tags ?? [],
  };
}
