import { useQuery } from '@tanstack/react-query';
import type { DiagnosticAttempt } from '@/domain/diagnostic';
import { getDiagnosticHistory, getLatestDiagnostic } from '../data/diagnosticService';

export const latestDiagnosticQueryKey = ['diagnostic', 'latest'] as const;
export const diagnosticHistoryQueryKey = ['diagnostic', 'history'] as const;

/** Último test de diagnóstico realizado, si existe. */
export function useLatestDiagnostic() {
  return useQuery<DiagnosticAttempt | null>({
    queryKey: latestDiagnosticQueryKey,
    queryFn: getLatestDiagnostic,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** Historial de intentos, del más reciente al más antiguo. */
export function useDiagnosticHistory() {
  return useQuery<DiagnosticAttempt[]>({
    queryKey: diagnosticHistoryQueryKey,
    queryFn: getDiagnosticHistory,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
