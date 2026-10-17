/**
 * Modelo de las lecciones de microlearning.
 *
 * Enfoque de *active recall*: cada lección plantea un problema real que el
 * usuario debe resolver **antes** de ver la explicación. No hay texto estático
 * que leer de principio a fin: hay decisiones que tomar.
 *
 * Módulo PURO.
 */

import type { Difficulty } from './question';
import type { DomainId } from './domain';

export type LessonStepKind = 'scenario' | 'decision';

export interface LessonOption {
  id: string;
  text: string;
}

interface LessonStepBase {
  id: string;
  kind: LessonStepKind;
  /** Título corto del paso, visible en la cabecera. */
  title: string;
  /** El problema o la situación a resolver. */
  prompt: string;
  /** Explicación que se muestra al avanzar (o al responder). */
  explanation: string;
  /** Idea clave que el usuario debería llevarse. */
  takeaway?: string;
}

/** Paso informativo: plantea un escenario y revela la explicación. */
export interface ScenarioStep extends LessonStepBase {
  kind: 'scenario';
}

/** Paso evaluable: el usuario decide y recibe feedback inmediato. */
export interface DecisionStep extends LessonStepBase {
  kind: 'decision';
  answerType: 'single' | 'multiple';
  options: LessonOption[];
  correctOptionIds: string[];
}

export type LessonStep = ScenarioStep | DecisionStep;

export interface Lesson {
  id: string;
  domain: DomainId;
  /** Sub-objetivos del blueprint que cubre la lección. */
  objectives: string[];
  title: string;
  summary: string;
  estimatedMinutes: number;
  difficulty: Difficulty;
  tags: string[];
  steps: LessonStep[];
}

export type LessonStatus = 'in-progress' | 'completed';

/** Progreso persistido de una lección (una fila por lección). */
export interface LessonProgress {
  lessonId: string;
  domain: DomainId;
  status: LessonStatus;
  /** Paso en el que quedó el usuario, para poder reanudar. */
  currentStepIndex: number;
  /** stepId → ids de opción seleccionados. */
  answers: Record<string, string[]>;
  correctDecisions: number;
  totalDecisions: number;
  /** 0..100 */
  scorePercent: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/** Resultado del cálculo de una lección (no se persiste por separado). */
export interface LessonEvaluation {
  lessonId: string;
  totalDecisions: number;
  correctDecisions: number;
  scorePercent: number;
  passed: boolean;
}

export function isDecisionStep(step: LessonStep): step is DecisionStep {
  return step.kind === 'decision';
}
