/**
 * Validación del banco de preguntas con Zod.
 *
 * Además del tipado, se comprueban invariantes que un error de edición manual
 * rompería silenciosamente:
 *  - los IDs de opción son únicos dentro de la pregunta;
 *  - `correctOptionIds` referencia opciones existentes;
 *  - `single` tiene exactamente una correcta y `multiple` al menos dos.
 */

import { z } from 'zod';
import { domainIdSchema } from './cardSeedSchema';

export const questionOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const questionSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'El id debe ser kebab-case en minúsculas (ej. "d4-q03").'),
    domain: domainIdSchema,
    objective: z.string().regex(/^\d+\.\d+$/, 'El objetivo debe tener el formato "N.N" (ej. "4.3").'),
    type: z.enum(['single', 'multiple']),
    stem: z.string().min(1),
    options: z.array(questionOptionSchema).min(2).max(6),
    correctOptionIds: z.array(z.string().min(1)).min(1),
    explanation: z.string().min(1),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    tags: z.array(z.string()).default([]),
  })
  .superRefine((question, ctx) => {
    const optionIds = new Set(question.options.map((option) => option.id));

    if (optionIds.size !== question.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Los ids de opción deben ser únicos dentro de la pregunta.',
      });
    }

    for (const correctId of question.correctOptionIds) {
      if (!optionIds.has(correctId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctOptionIds'],
          message: `La opción correcta "${correctId}" no existe entre las opciones.`,
        });
      }
    }

    if (new Set(question.correctOptionIds).size !== question.correctOptionIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctOptionIds'],
        message: 'No puede haber opciones correctas duplicadas.',
      });
    }

    if (question.type === 'single' && question.correctOptionIds.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctOptionIds'],
        message: 'Una pregunta "single" debe tener exactamente una respuesta correcta.',
      });
    }

    if (question.type === 'multiple' && question.correctOptionIds.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctOptionIds'],
        message: 'Una pregunta "multiple" debe tener al menos dos respuestas correctas.',
      });
    }
  });

export const questionListSchema = z.array(questionSchema);
