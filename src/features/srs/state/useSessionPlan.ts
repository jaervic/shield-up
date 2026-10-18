import { useQuery } from '@tanstack/react-query';
import {
  buildDailyQueue,
  DEFAULT_NEW_LIMIT,
  summarizeQueue,
  type SessionPlan,
} from '../engine/queue';
import { getSrsRepository } from '../data/repository';

export const sessionPlanQueryKey = ['srs', 'plan'] as const;

/**
 * Calcula la sesión ANTES de empezarla, con la misma semilla que usará el
 * store, para poder anunciar cuántas tarjetas son y cuánto se tardará.
 */
export function useSessionPlan(newLimit = DEFAULT_NEW_LIMIT) {
  return useQuery<SessionPlan>({
    queryKey: [...sessionPlanQueryKey, newLimit],
    queryFn: async () => {
      const cards = await getSrsRepository().getCards();
      return summarizeQueue(buildDailyQueue(cards, new Date(), { newLimit }));
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
