/**
 * Corrección y evaluación de un intento de diagnóstico.
 *
 * Módulo PURO: recibe preguntas y respuestas y devuelve el resultado completo
 * (proficiencia por dominio, readiness ponderada y ruta de estudio).
 */

import type { DiagnosticAttempt } from '@/domain/diagnostic';
import type { AnswerRecord, Question } from '@/domain/question';
import { computeProficiency, computeReadiness } from './proficiency';
import { buildStudyRoute } from './route';

/**
 * Una respuesta es correcta solo si el conjunto seleccionado coincide
 * exactamente con el conjunto correcto: en preguntas `multiple` no vale
 * acertar una parte.
 */
export function gradeAnswer(question: Question, selectedOptionIds: readonly string[]): boolean {
  const correct = new Set(question.correctOptionIds);
  if (selectedOptionIds.length !== correct.size) return false;
  return selectedOptionIds.every((id) => correct.has(id));
}

export interface AttemptMeta {
  attemptId: string;
  startedAt: string;
  completedAt: string;
}

export function evaluateAttempt(
  questions: readonly Question[],
  answers: readonly AnswerRecord[],
  meta: AttemptMeta,
): DiagnosticAttempt {
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

  // Normaliza: toda pregunta del test tiene una respuesta (aunque sea vacía).
  const normalizedAnswers: AnswerRecord[] = questions.map((question) => {
    const existing = answerByQuestion.get(question.id);
    const selected = existing?.selectedOptionIds ?? [];
    return {
      questionId: question.id,
      selectedOptionIds: [...selected],
      isCorrect: gradeAnswer(question, selected),
      answeredAt: existing?.answeredAt ?? meta.completedAt,
    };
  });

  const proficiencyByDomain = computeProficiency(questions, normalizedAnswers);
  const correctCount = normalizedAnswers.filter((answer) => answer.isCorrect).length;
  const totalQuestions = questions.length;

  return {
    id: meta.attemptId,
    startedAt: meta.startedAt,
    completedAt: meta.completedAt,
    questionIds: questions.map((question) => question.id),
    answers: normalizedAnswers,
    totalQuestions,
    correctCount,
    scorePercent: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    readinessPercent: Math.round(computeReadiness(proficiencyByDomain) * 100),
    proficiencyByDomain,
    route: buildStudyRoute(proficiencyByDomain, new Date(meta.completedAt)),
  };
}
