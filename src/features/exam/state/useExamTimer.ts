import { useEffect, useRef, useState } from 'react';
import { examTimerState, type ExamTimerState } from '../engine/timer';

/**
 * Cuenta atrás del simulacro.
 *
 * El tiempo restante se recalcula desde `startedAt` en cada tick, no se
 * decrementa: así no se desvía si el navegador suspende la pestaña.
 */
export function useExamTimer(
  startedAt: string | null,
  durationMinutes: number,
  onExpire: () => void,
): ExamTimerState {
  const [state, setState] = useState<ExamTimerState>(() =>
    examTimerState(startedAt ?? new Date().toISOString(), durationMinutes),
  );

  const expireRef = useRef(onExpire);
  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (startedAt === null || durationMinutes <= 0) return;

    const tick = () => {
      const next = examTimerState(startedAt, durationMinutes);
      setState(next);
      if (next.expired) expireRef.current();
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationMinutes]);

  return state;
}
