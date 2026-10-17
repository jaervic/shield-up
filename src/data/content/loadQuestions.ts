/**
 * Carga y validación del banco de preguntas.
 *
 * Único punto que conoce el formato de /content/questions.
 */

import type { Question } from '@/domain/question';
import d1Raw from '@content/questions/d1.json';
import d2Raw from '@content/questions/d2.json';
import d3Raw from '@content/questions/d3.json';
import d4Raw from '@content/questions/d4.json';
import d5Raw from '@content/questions/d5.json';
import { questionListSchema } from './questionSchema';

export function loadQuestions(): Question[] {
  const raw = [...d1Raw, ...d2Raw, ...d3Raw, ...d4Raw, ...d5Raw];
  const parsed = questionListSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Preguntas inválidas en /content/questions:\n${details}`);
  }

  const seen = new Set<string>();
  const unique: Question[] = [];
  for (const question of parsed.data) {
    if (seen.has(question.id)) {
      throw new Error(`ID de pregunta duplicado: "${question.id}"`);
    }
    seen.add(question.id);
    unique.push(question);
  }

  return unique;
}
