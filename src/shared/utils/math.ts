export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Redondeo a 2 decimales para evitar ruido de coma flotante al persistir. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
