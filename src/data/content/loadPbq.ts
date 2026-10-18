/**
 * Carga y validación del banco de PBQ.
 * Único punto que conoce el formato de /content/pbq.
 */

import type { Pbq } from '@/domain/pbq';
import terminalRaw from '@content/pbq/terminal.json';
import topologyRaw from '@content/pbq/topology.json';
import { pbqListSchema } from './pbqSchema';

export function loadPbq(): Pbq[] {
  const raw = [...topologyRaw, ...terminalRaw];
  const parsed = pbqListSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`PBQ inválidas en /content/pbq:\n${details}`);
  }

  return parsed.data;
}

export function loadPbqByKind(kind: Pbq['kind']): Pbq[] {
  return loadPbq().filter((pbq) => pbq.kind === kind);
}
