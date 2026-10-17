/**
 * Validación del contenido con Zod.
 *
 * El contenido vive en /content/flashcards/*.json y es editado a mano, así que
 * se valida al cargar para no meter tarjetas corruptas en IndexedDB.
 */

import { z } from 'zod';

export const domainIdSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const cardTypeSchema = z.enum(['port', 'acronym', 'crypto', 'concept']);

export const cardSeedSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'El id debe ser kebab-case en minúsculas (ej. "port-ssh").'),
  domain: domainIdSchema,
  type: cardTypeSchema,
  front: z.string().min(1),
  back: z.string().min(1),
  hint: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

export const cardSeedListSchema = z.array(cardSeedSchema);

export type ValidatedCardSeed = z.infer<typeof cardSeedSchema>;
