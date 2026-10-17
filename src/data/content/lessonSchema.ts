/**
 * Validación del contenido de lecciones con Zod.
 *
 * Las invariantes de las decisiones (opciones únicas, respuestas correctas
 * existentes, cardinalidad según `answerType`) se comprueban a nivel de lección
 * porque afectan a los pasos y no solo a un campo.
 */

import { z } from 'zod';
import { domainIdSchema } from './cardSeedSchema';

export const lessonOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const baseStepFields = {
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'El id del paso debe ser kebab-case en minúsculas (ej. "s1").'),
  title: z.string().min(1),
  prompt: z.string().min(1),
  explanation: z.string().min(1),
  takeaway: z.string().min(1).optional(),
};

export const scenarioStepSchema = z.object({
  kind: z.literal('scenario'),
  ...baseStepFields,
});

export const decisionStepSchema = z.object({
  kind: z.literal('decision'),
  answerType: z.enum(['single', 'multiple']),
  options: z.array(lessonOptionSchema).min(2).max(6),
  correctOptionIds: z.array(z.string().min(1)).min(1),
  ...baseStepFields,
});

export const lessonStepSchema = z.discriminatedUnion('kind', [
  scenarioStepSchema,
  decisionStepSchema,
]);

export const lessonSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'El id debe ser kebab-case en minúsculas (ej. "d4-l1").'),
    domain: domainIdSchema,
    objectives: z.array(z.string().regex(/^\d+\.\d+$/)).min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    estimatedMinutes: z.number().int().positive().max(30),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    tags: z.array(z.string()).default([]),
    steps: z.array(lessonStepSchema).min(2),
  })
  .superRefine((lesson, ctx) => {
    const stepIds = new Set<string>();

    if (!lesson.steps.some((step) => step.kind === 'decision')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['steps'],
        message: 'Una lección debe tener al menos un paso de decisión evaluable.',
      });
    }

    for (const [index, step] of lesson.steps.entries()) {
      if (stepIds.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', index, 'id'],
          message: `Id de paso duplicado: "${step.id}".`,
        });
      }
      stepIds.add(step.id);

      if (step.kind !== 'decision') continue;

      const optionIds = new Set(step.options.map((option) => option.id));
      if (optionIds.size !== step.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', index, 'options'],
          message: 'Los ids de opción deben ser únicos dentro del paso.',
        });
      }

      for (const correctId of step.correctOptionIds) {
        if (!optionIds.has(correctId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['steps', index, 'correctOptionIds'],
            message: `La opción correcta "${correctId}" no existe entre las opciones.`,
          });
        }
      }

      if (new Set(step.correctOptionIds).size !== step.correctOptionIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', index, 'correctOptionIds'],
          message: 'No puede haber opciones correctas duplicadas.',
        });
      }

      if (step.answerType === 'single' && step.correctOptionIds.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', index, 'correctOptionIds'],
          message: 'Una decisión "single" debe tener exactamente una respuesta correcta.',
        });
      }

      if (step.answerType === 'multiple' && step.correctOptionIds.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', index, 'correctOptionIds'],
          message: 'Una decisión "multiple" debe tener al menos dos respuestas correctas.',
        });
      }
    }
  });

export const lessonListSchema = z.array(lessonSchema);
