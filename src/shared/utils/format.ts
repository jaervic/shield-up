/** Formateadores de presentación (es-ES). */

export function formatIntervalDays(days: number): string {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'en 1 día';
  if (days < 30) return `en ${days} días`;
  const months = Math.round(days / 30);
  if (months <= 1) return 'en ~1 mes';
  if (months < 12) return `en ~${months} meses`;
  const years = (days / 365).toFixed(1);
  return `en ~${years} años`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value * 100)}%`;
}

/** Fecha y hora legibles en es-ES, a partir de una cadena ISO. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/** Día y mes abreviados (para etiquetas compactas de gráficos). */
export function formatDayMonth(dateKey: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(
    new Date(`${dateKey}T00:00:00.000Z`),
  );
}
