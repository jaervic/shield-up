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
