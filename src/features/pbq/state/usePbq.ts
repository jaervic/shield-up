import { useQuery } from '@tanstack/react-query';
import type { Pbq } from '@/domain/pbq';
import { listPbq, loadPbqProgress, type PbqProgress } from '../data/pbqService';

export const pbqCatalogQueryKey = ['pbq', 'catalog'] as const;

export interface PbqCatalog {
  pbq: Pbq[];
  progress: Record<string, PbqProgress>;
}

async function fetchCatalog(): Promise<PbqCatalog> {
  const [pbq, progress] = await Promise.all([Promise.resolve(listPbq()), loadPbqProgress()]);
  return { pbq, progress };
}

export function usePbqCatalog() {
  return useQuery<PbqCatalog>({
    queryKey: pbqCatalogQueryKey,
    queryFn: fetchCatalog,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
