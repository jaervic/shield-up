/**
 * Carga y validación de las lecciones de microlearning.
 * Único punto que conoce el formato de /content/lessons.
 */

import type { Lesson } from '@/domain/lesson';
import d1Raw from '@content/lessons/d1.json';
import d2Raw from '@content/lessons/d2.json';
import d3Raw from '@content/lessons/d3.json';
import d4Raw from '@content/lessons/d4.json';
import d5Raw from '@content/lessons/d5.json';
import { lessonListSchema } from './lessonSchema';

export function loadLessons(): Lesson[] {
  const raw = [...d1Raw, ...d2Raw, ...d3Raw, ...d4Raw, ...d5Raw];
  const parsed = lessonListSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Lecciones inválidas en /content/lessons:\n${details}`);
  }

  const seen = new Set<string>();
  const unique: Lesson[] = [];
  for (const lesson of parsed.data) {
    if (seen.has(lesson.id)) {
      throw new Error(`ID de lección duplicado: "${lesson.id}"`);
    }
    seen.add(lesson.id);
    unique.push(lesson);
  }

  return unique;
}
