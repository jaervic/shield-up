/**
 * Mapa de calor de actividad.
 *
 * Módulo PURO. Convierte el histórico de repasos en una rejilla de días con
 * nivel de intensidad. Ver el hábito dibujado es uno de los refuerzos más
 * baratos y eficaces para sostener la constancia.
 */

import type { Review } from '@/domain/card';
import { addDays, startOfDay, toDateKey } from '@/shared/utils/date';

/** Niveles 0..4 y el mínimo de repasos que exige cada uno. */
export const ACTIVITY_THRESHOLDS: readonly [number, number, number, number] = [1, 5, 10, 20];

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityDay {
  /** YYYY-MM-DD (UTC). */
  date: string;
  count: number;
  level: ActivityLevel;
}

export interface ActivityHeatmap {
  days: ActivityDay[];
  weeks: number;
  /** Días de la ventana con al menos un repaso. */
  activeDays: number;
  totalReviews: number;
  maxCount: number;
  busiestDate: string | null;
  /** Resumen textual: es la alternativa accesible del gráfico. */
  summary: string;
}

export function activityLevel(count: number): ActivityLevel {
  if (count <= 0) return 0;
  if (count < ACTIVITY_THRESHOLDS[1]) return 1;
  if (count < ACTIVITY_THRESHOLDS[2]) return 2;
  if (count < ACTIVITY_THRESHOLDS[3]) return 3;
  return 4;
}

export function computeActivityHeatmap(
  reviews: readonly Review[],
  now: Date = new Date(),
  weeks = 12,
): ActivityHeatmap {
  const safeWeeks = Math.max(1, Math.floor(weeks));
  const totalDays = safeWeeks * 7;

  const counts = new Map<string, number>();
  for (const review of reviews) {
    const key = toDateKey(new Date(review.reviewedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const end = startOfDay(now);
  const start = addDays(end, -(totalDays - 1));

  const days: ActivityDay[] = [];
  for (let offset = 0; offset < totalDays; offset += 1) {
    const date = toDateKey(addDays(start, offset));
    const count = counts.get(date) ?? 0;
    days.push({ date, count, level: activityLevel(count) });
  }

  const activeDays = days.filter((day) => day.count > 0).length;
  const busiest = days.reduce<ActivityDay | null>(
    (best, day) => (best === null || day.count > best.count ? day : best),
    null,
  );
  const maxCount = busiest?.count ?? 0;

  return {
    days,
    weeks: safeWeeks,
    activeDays,
    totalReviews: days.reduce((sum, day) => sum + day.count, 0),
    maxCount,
    busiestDate: maxCount > 0 ? (busiest?.date ?? null) : null,
    summary:
      activeDays === 0
        ? `Sin actividad en las últimas ${safeWeeks} semanas.`
        : `Actividad de las últimas ${safeWeeks} semanas: ${activeDays} de ${totalDays} días con repasos y ${days.reduce((sum, day) => sum + day.count, 0)} repasos en total.`,
  };
}
