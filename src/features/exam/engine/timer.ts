/**
 * Cronómetro del simulacro.
 *
 * Módulo PURO: todo se calcula a partir de `startedAt`, así que el tiempo
 * restante es siempre reproducible y no depende de cuántas veces se haya
 * renderizado la interfaz.
 */

export interface ExamTimerState {
  elapsedSeconds: number;
  remainingSeconds: number;
  /** true cuando ya no queda tiempo. */
  expired: boolean;
}

export function examTimerState(
  startedAt: string,
  durationMinutes: number,
  now: Date = new Date(),
): ExamTimerState {
  const started = new Date(startedAt).getTime();
  const total = Math.max(0, durationMinutes * 60);
  const elapsed = Math.max(0, Math.floor((now.getTime() - started) / 1000));
  const remaining = Math.max(0, total - elapsed);

  return { elapsedSeconds: Math.min(elapsed, total), remainingSeconds: remaining, expired: remaining === 0 };
}

/** Reloj en formato MM:SS (o HH:MM:SS si pasara de una hora). */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** Aviso cuando queda poco tiempo, para que la interfaz lo destaque. */
export const EXAM_WARNING_SECONDS = 300;

export function isTimeRunningOut(remainingSeconds: number): boolean {
  return remainingSeconds > 0 && remainingSeconds <= EXAM_WARNING_SECONDS;
}

/** Umbrales de aviso, de más lejano a más inmediato. */
export type TimeWarningLevel = 'ten' | 'five' | 'one';

/**
 * Nivel de aviso según el tiempo que queda.
 *
 * Devuelve un NIVEL y no un texto: el motor es puro y no sabe de idiomas. La
 * interfaz lo traduce.
 *
 * Importante para accesibilidad: el valor es **estable dentro de cada tramo**
 * (de 10 minutos hacia abajo devuelve `ten` hasta que entra en el siguiente
 * umbral), así que una región `aria-live` solo anuncia cuando cambia de tramo y
 * no cada segundo.
 */
export function timeWarningLevel(remainingSeconds: number): TimeWarningLevel | null {
  if (remainingSeconds <= 0) return null;
  if (remainingSeconds <= 60) return 'one';
  if (remainingSeconds <= 300) return 'five';
  if (remainingSeconds <= 600) return 'ten';
  return null;
}
