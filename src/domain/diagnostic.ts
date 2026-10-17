/**
 * Modelo del test de diagnóstico y de la ruta de estudio personalizada.
 *
 * Módulo PURO: lo comparten el motor de diagnóstico, la persistencia y la UI.
 */

import type { DomainId } from './domain';
import type { AnswerRecord } from './question';

/** Rendimiento medido en un dominio durante un intento de diagnóstico. */
export interface DomainProficiency {
  domain: DomainId;
  asked: number;
  correct: number;
  /** 0..1. Vale 0 si el dominio no se evaluó. */
  accuracy: number;
  /** false si el intento no incluyó preguntas de este dominio. */
  evaluated: boolean;
}

/** Paso de la ruta de estudio, ordenado por prioridad descendente. */
export interface RouteStep {
  domain: DomainId;
  /** 0..1: proporción de conocimiento que falta. */
  gap: number;
  /** Peso del examen × hueco. Mayor = estudiar antes. */
  priority: number;
  reason: string;
  /** Sugerencia de tarjetas a trabajar en este dominio. */
  estimatedCards: number;
}

export interface StudyRoute {
  generatedAt: string;
  steps: RouteStep[];
  /** Dominio con mayor prioridad: por dónde empezar. */
  focusDomain: DomainId;
}

/** Resultado completo y persistido de un test de diagnóstico. */
export interface DiagnosticAttempt {
  id: string;
  startedAt: string;
  completedAt: string;
  questionIds: string[];
  answers: AnswerRecord[];
  totalQuestions: number;
  correctCount: number;
  /** 0..100, simple proporción de aciertos. */
  scorePercent: number;
  /** 0..100, ponderado por el peso de cada dominio en el examen. */
  readinessPercent: number;
  proficiencyByDomain: Record<DomainId, DomainProficiency>;
  route: StudyRoute;
}
