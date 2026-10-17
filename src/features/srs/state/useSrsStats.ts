import { useQuery } from '@tanstack/react-query';
import {
  computeStats,
  computeStudyStreak,
  countReviewsOn,
  projectReviewLoad,
  type ReviewLoadPoint,
  type SrsStats,
  type StudyStreak,
} from '../engine/stats';
import { getSrsRepository } from '../data/repository';

export const srsStatsQueryKey = ['srs', 'stats'] as const;

export interface SrsStatsPayload {
  stats: SrsStats;
  load: ReviewLoadPoint[];
  streak: StudyStreak;
  /** Repasos hechos hoy, para el objetivo diario. */
  reviewedToday: number;
}

async function fetchStats(): Promise<SrsStatsPayload> {
  const repository = getSrsRepository();
  const [cards, reviews] = await Promise.all([repository.getCards(), repository.getReviews()]);
  const now = new Date();

  return {
    stats: computeStats(cards, reviews, now),
    load: projectReviewLoad(cards, now, 14),
    streak: computeStudyStreak(reviews, now),
    reviewedToday: countReviewsOn(reviews, now),
  };
}

/** Lectura agregada del progreso. Se recalcula al montar el dashboard. */
export function useSrsStats() {
  return useQuery({
    queryKey: srsStatsQueryKey,
    queryFn: fetchStats,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
