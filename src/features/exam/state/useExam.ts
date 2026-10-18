import { useQuery } from '@tanstack/react-query';
import type { ExamAttempt } from '@/domain/exam';
import { getLatestExamAttempt } from '../data/examService';

export const latestExamQueryKey = ['exam', 'latest'] as const;

export function useLatestExam() {
  return useQuery<ExamAttempt | null>({
    queryKey: latestExamQueryKey,
    queryFn: getLatestExamAttempt,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
