/**
 * Carga y validación del contenido seed.
 *
 * Es el único punto que conoce el formato de /content. Devuelve `CardSeed[]`
 * ya validado, deduplicado y listo para `createCardsFromSeeds`.
 */

import type { CardSeed } from '@/domain/card';
import acronymsRaw from '@content/flashcards/acronyms.json';
import cryptoRaw from '@content/flashcards/crypto.json';
import defenseRaw from '@content/flashcards/defense.json';
import portsRaw from '@content/flashcards/ports.json';
import programRaw from '@content/flashcards/program.json';
import { cardSeedListSchema } from './cardSeedSchema';

export function loadCardSeeds(): CardSeed[] {
  const raw = [...portsRaw, ...acronymsRaw, ...cryptoRaw, ...programRaw, ...defenseRaw];
  const parsed = cardSeedListSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Contenido inválido en /content/flashcards:\n${details}`);
  }

  const seen = new Set<string>();
  const unique: CardSeed[] = [];
  for (const seed of parsed.data) {
    if (seen.has(seed.id)) {
      throw new Error(`ID de tarjeta duplicado en el contenido: "${seed.id}"`);
    }
    seen.add(seed.id);
    unique.push(seed);
  }

  return unique;
}
