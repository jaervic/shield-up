import { useQuery } from '@tanstack/react-query';
import type { StudyRoute } from '@/domain/diagnostic';
import type { DomainId } from '@/domain/domain';
import type { Lesson, LessonProgress } from '@/domain/lesson';
import { summarizeByDomain, type DomainLessonSummary } from '../engine/progress';
import type { LessonRecommendation } from '../engine/recommend';
import { buildRecommendations, listLessons, loadProgressMap } from '../data/lessonService';

export const lessonCatalogQueryKey = ['lessons', 'catalog'] as const;

export interface LessonCatalog {
  lessons: Lesson[];
  progress: Record<string, LessonProgress>;
  byDomain: Record<DomainId, DomainLessonSummary>;
}

async function fetchCatalog(): Promise<LessonCatalog> {
  const lessons = listLessons();
  const progress = await loadProgressMap();
  return { lessons, progress, byDomain: summarizeByDomain(lessons, progress) };
}

/** Catálogo completo con el progreso y el resumen por dominio. */
export function useLessonCatalog() {
  return useQuery<LessonCatalog>({
    queryKey: lessonCatalogQueryKey,
    queryFn: fetchCatalog,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function lessonRecommendationsQueryKey(routeGeneratedAt: string | null) {
  return ['lessons', 'recommendations', routeGeneratedAt] as const;
}

/**
 * Lecciones recomendadas según la ruta del último diagnóstico.
 * La clave de caché usa `generatedAt` de la ruta como identificador del intento.
 */
export function useLessonRecommendations(route: StudyRoute | null, limit = 3) {
  return useQuery<LessonRecommendation[]>({
    queryKey: lessonRecommendationsQueryKey(route?.generatedAt ?? null),
    queryFn: () => buildRecommendations(route, limit),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
