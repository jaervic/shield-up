/**
 * Utilidades de fecha puras y deterministas.
 *
 * Se evita date-fns en el motor para que los tests no dependan de zona horaria
 * ni de locale: aquí todo se calcula en milisegundos UTC.
 */

export const MS_PER_DAY = 86_400_000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Diferencia en días (puede ser fraccionaria). */
export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_DAY;
}

/** Días completos transcurridos, nunca negativos. */
export function fullDaysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor(daysBetween(from, to)));
}

export function isDue(dueAt: string, now: Date): boolean {
  return new Date(dueAt).getTime() <= now.getTime();
}

/** Inicio del día en UTC, útil para agrupar cargas de repaso por fecha. */
export function startOfDay(date: Date): Date {
  return new Date(Math.floor(date.getTime() / MS_PER_DAY) * MS_PER_DAY);
}

/** Clave de fecha estable para agrupar (YYYY-MM-DD). */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
