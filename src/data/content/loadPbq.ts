/**
 * Carga y validación del banco de PBQ.
 * Único punto que conoce el formato de /content/pbq.
 */

import type { Pbq } from '@/domain/pbq';
import terminalRaw from '@content/pbq/terminal.json';
import topologyRaw from '@content/pbq/topology.json';
import { pbqListSchema } from './pbqSchema';

/**
 * Caché del contenido ya validado.
 *
 * Es contenido estático: volver a validarlo con Zod en cada llamada era caro y,
 * peor, devolvía objetos NUEVOS en cada lectura. Eso rompía la identidad de
 * referencia y provocaba bucles de render en los componentes que dependen del
 * objeto de la PBQ.
 */
let cache: Pbq[] | null = null;

export function loadPbq(): Pbq[] {
  if (cache !== null) return cache;

  const raw = [...topologyRaw, ...terminalRaw];
  const parsed = pbqListSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`PBQ inválidas en /content/pbq:\n${details}`);
  }

  cache = parsed.data;
  return cache;
}

export function loadPbqByKind(kind: Pbq['kind']): Pbq[] {
  return loadPbq().filter((pbq) => pbq.kind === kind);
}
