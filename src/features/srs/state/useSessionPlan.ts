import { useQuery } from '@tanstack/react-query';
import type { DomainId } from '@/domain/domain';
import {
  buildDailyQueue,
  DEFAULT_NEW_LIMIT,
  summarizeQueue,
  type SessionPlan,
} from '../engine/queue';
import { getSrsRepository } from '../data/repository';

export const sessionPlanQueryKey = ['srs', 'plan'] as const;

/** Clave estable para el filtro de dominios (el orden no debe afectar). */
function domainsKey(domains: readonly DomainId[]): string {
  return [...domains].sort((a, b) => a - b).join(',');
}

/**
 * Calcula la sesión ANTES de empezarla, con la misma semilla que usará el
 * store, para poder anunciar cuántas tarjetas son y cuánto se tardará.
 *
 * `onlyDomains` permite la práctica dirigida: repasar solo un dominio.
 */
export function useSessionPlan(
  newLimit = DEFAULT_NEW_LIMIT,
  onlyDomains: readonly DomainId[] = [],
) {
  return useQuery<SessionPlan>({
    queryKey: [...sessionPlanQueryKey, newLimit, domainsKey(onlyDomains)],
    queryFn: async () => {
      const cards = await getSrsRepository().getCards();
      return summarizeQueue(
        buildDailyQueue(cards, new Date(), {
          newLimit,
          ...(onlyDomains.length > 0 ? { onlyDomains } : {}),
        }),
      );
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
