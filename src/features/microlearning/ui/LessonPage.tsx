import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getDomain } from '@/domain/domain';
import { isDecisionStep } from '@/domain/lesson';
import { Button } from '@/shared/ui/Button';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { gradeStep } from '../engine/scoring';
import {
  countAnsweredDecisions,
  selectCurrentSelection,
  selectCurrentStep,
  useLessonStore,
} from '../state/lessonStore';
import { LessonResults } from './LessonResults';
import { LessonStepView } from './LessonStepView';
import styles from './LessonPage.module.css';

/** Lección paso a paso: plantea el problema, el usuario decide y recibe feedback. */
export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();

  const status = useLessonStore((state) => state.status);
  const error = useLessonStore((state) => state.error);
  const lesson = useLessonStore((state) => state.lesson);
  const stepIndex = useLessonStore((state) => state.stepIndex);
  const answers = useLessonStore((state) => state.answers);
  const revealed = useLessonStore((state) => state.revealed);
  const resumed = useLessonStore((state) => state.resumed);
  const evaluation = useLessonStore((state) => state.evaluation);
  const step = useLessonStore(selectCurrentStep);
  const selection = useLessonStore(selectCurrentSelection);

  const start = useLessonStore((state) => state.start);
  const toggleOption = useLessonStore((state) => state.toggleOption);
  const submitStep = useLessonStore((state) => state.submitStep);
  const nextStep = useLessonStore((state) => state.nextStep);
  const restart = useLessonStore((state) => state.restart);

  useEffect(() => {
    if (lessonId) {
      void start(lessonId);
    }
  }, [lessonId, start]);

  if (status === 'idle' || status === 'loading') {
    return (
      <p className={styles.state} role="status">
        Cargando la lección…
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.state} role="alert">
        <p>No se pudo abrir la lección.</p>
        <p className={styles.errorDetail}>{error}</p>
        {lessonId ? (
          <Button variant="primary" onClick={() => void start(lessonId)}>
            Reintentar
          </Button>
        ) : null}
      </div>
    );
  }

  if (status === 'completed' && lesson && evaluation) {
    return (
      <LessonResults lesson={lesson} evaluation={evaluation} onRestart={() => void restart()} />
    );
  }

  if (!lesson || !step) {
    return <p className={styles.state}>No hay contenido para esta lección.</p>;
  }

  const isDecision = isDecisionStep(step);
  const isCorrect = isDecision ? gradeStep(step, selection) : false;
  const isLastStep = stepIndex >= lesson.steps.length - 1;
  const decisions = countAnsweredDecisions(lesson, answers);

  return (
    <section className={styles.lesson} aria-label={lesson.title}>
      <header className={styles.header}>
        <div>
          <p className={styles.domain}>
            D{lesson.domain} · {getDomain(lesson.domain).nameEs} · ~{lesson.estimatedMinutes} min
          </p>
          <h1 className={styles.title}>{lesson.title}</h1>
          <p className={styles.summary}>{lesson.summary}</p>
        </div>
        <p className={styles.counter}>
          {decisions.answered}/{decisions.total} decisiones
        </p>
      </header>

      {resumed ? (
        <p className={styles.resumed} role="status">
          Has reanudado esta lección donde la dejaste.
        </p>
      ) : null}

      <ProgressBar
        value={stepIndex + 1}
        max={lesson.steps.length}
        label={`Progreso de la lección: paso ${stepIndex + 1} de ${lesson.steps.length}`}
      />

      <LessonStepView
        step={step}
        selectedOptionIds={selection}
        revealed={revealed}
        isCorrect={isCorrect}
        onToggle={toggleOption}
        position={stepIndex + 1}
        total={lesson.steps.length}
      />

      <div className={styles.actions}>
        {revealed ? (
          <Button variant="primary" onClick={() => void nextStep()}>
            {isLastStep ? 'Finalizar lección' : 'Continuar'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => void submitStep()}
            disabled={isDecision && selection.length === 0}
          >
            {isDecision ? 'Comprobar' : 'Ver explicación'}
          </Button>
        )}
      </div>
    </section>
  );
}
