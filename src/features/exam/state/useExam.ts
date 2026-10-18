import { useQuery } from '@tanstack/react-query';
import type { ExamAttempt } from '@/domain/exam';
import { getExamHistory, getLatestExamAttempt } from '../data/examService';

export const latestExamQueryKey = ['exam', 'latest'] as const;
export const examHistoryQueryKey = ['exam', 'history'] as const;

export function useLatestExam() {
  return useQuery<ExamAttempt | null>({
    queryKey: latestExamQueryKey,
    queryFn: getLatestExamAttempt,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** Historial de simulacros, del más reciente al más antiguo. */
export function useExamHistory() {
  return useQuery<ExamAttempt[]>({
    queryKey: examHistoryQueryKey,
    queryFn: getExamHistory,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
