import { useQuery } from '@tanstack/react-query';
import { computeStats, projectReviewLoad, type SrsStats } from '../engine/stats';
import { getSrsRepository } from '../data/repository';

export const srsStatsQueryKey = ['srs', 'stats'] as const;

export interface SrsStatsPayload {
  stats: SrsStats;
  load: ReturnType<typeof projectReviewLoad>;
}

async function fetchStats(): Promise<SrsStatsPayload> {
  const repository = getSrsRepository();
  const [cards, reviews] = await Promise.all([repository.getCards(), repository.getReviews()]);
  const now = new Date();
  return {
    stats: computeStats(cards, reviews, now),
    load: projectReviewLoad(cards, now, 14),
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
