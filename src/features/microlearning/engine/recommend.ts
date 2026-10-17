/**
 * Recomendación de lecciones ligada a la ruta de estudio.
 *
 * La ruta del diagnóstico (Fase 2) ordena los dominios por impacto. Aquí se
 * hereda esa prioridad y se ordenan las lecciones dentro de cada dominio:
 * primero las no superadas y, entre ellas, las de peor resultado.
 */

import type { StudyRoute } from '@/domain/diagnostic';
import { DOMAIN_IDS, DOMAIN_WEIGHTS, getDomain, type DomainId } from '@/domain/domain';
import type { Lesson, LessonProgress } from '@/domain/lesson';
import { round2 } from '@/shared/utils/math';

/** Las lecciones ya superadas bajan en la lista, pero no desaparecen. */
export const COMPLETED_PRIORITY_FACTOR = 0.2;

export interface LessonRecommendation {
  lessonId: string;
  domain: DomainId;
  title: string;
  summary: string;
  estimatedMinutes: number;
  priority: number;
  reason: string;
  completed: boolean;
  scorePercent: number | null;
}

export function recommendLessons(
  lessons: readonly Lesson[],
  progressByLesson: Readonly<Record<string, LessonProgress>>,
  route: StudyRoute | null = null,
  limit = 3,
): LessonRecommendation[] {
  const domainContext = new Map<DomainId, { priority: number; reason: string }>();

  for (const id of DOMAIN_IDS) {
    const step = route?.steps.find((candidate) => candidate.domain === id);
    domainContext.set(id, {
      priority: step?.priority ?? DOMAIN_WEIGHTS[id],
      reason:
        step?.reason ??
        `${getDomain(id).nameEs}: aún sin diagnóstico. Se usa el peso del examen como prioridad.`,
    });
  }

  const recommendations = lessons.map<LessonRecommendation>((lesson) => {
    const progress = progressByLesson[lesson.id];
    const completed = progress?.status === 'completed';
    const context = domainContext.get(lesson.domain);
    const basePriority = context?.priority ?? 0;

    return {
      lessonId: lesson.id,
      domain: lesson.domain,
      title: lesson.title,
      summary: lesson.summary,
      estimatedMinutes: lesson.estimatedMinutes,
      priority: round2(basePriority * (completed ? COMPLETED_PRIORITY_FACTOR : 1)),
      reason: completed
        ? `Ya la superaste con ${progress?.scorePercent ?? 0}%. Repásala para consolidar.`
        : (context?.reason ?? ''),
      completed,
      scorePercent: completed ? (progress?.scorePercent ?? null) : null,
    };
  });

  return recommendations
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        Number(a.completed) - Number(b.completed) ||
        a.lessonId.localeCompare(b.lessonId),
    )
    .slice(0, Math.max(0, limit));
}
