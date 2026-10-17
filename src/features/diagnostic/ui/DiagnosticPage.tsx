import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_DIAGNOSTIC_LENGTH } from '../engine/selection';
import {
  latestDiagnosticQueryKey,
  useLatestDiagnostic,
} from '../state/useDiagnostic';
import {
  selectAnsweredCount,
  selectCurrentQuestion,
  selectCurrentSelection,
  useDiagnosticStore,
} from '../state/diagnosticStore';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Button } from '@/shared/ui/Button';
import { DiagnosticResults } from './DiagnosticResults';
import { QuestionCard } from './QuestionCard';
import styles from './DiagnosticPage.module.css';

/** Test de diagnóstico: mide los 5 dominios y genera la ruta de estudio. */
export function DiagnosticPage() {
  const status = useDiagnosticStore((state) => state.status);
  const error = useDiagnosticStore((state) => state.error);
  const index = useDiagnosticStore((state) => state.index);
  const total = useDiagnosticStore((state) => state.questions.length);
  const question = useDiagnosticStore(selectCurrentQuestion);
  const selection = useDiagnosticStore(selectCurrentSelection);
  const answeredCount = useDiagnosticStore(selectAnsweredCount);
  const attempt = useDiagnosticStore((state) => state.attempt);

  const start = useDiagnosticStore((state) => state.start);
  const toggleOption = useDiagnosticStore((state) => state.toggleOption);
  const next = useDiagnosticStore((state) => state.next);
  const previous = useDiagnosticStore((state) => state.previous);
  const submit = useDiagnosticStore((state) => state.submit);
  const reset = useDiagnosticStore((state) => state.reset);

  const { data: latest } = useLatestDiagnostic();
  const queryClient = useQueryClient();

  // Al terminar, refresca el dashboard con el nuevo intento.
  useEffect(() => {
    if (status === 'completed') {
      void queryClient.invalidateQueries({ queryKey: latestDiagnosticQueryKey });
    }
  }, [status, queryClient]);

  if (status === 'idle') {
    return (
      <section className={styles.intro} aria-labelledby="diagnostic-intro-title">
        <h2 id="diagnostic-intro-title">Test de diagnóstico</h2>
        <p>
          Un test corto de {DEFAULT_DIAGNOSTIC_LENGTH} preguntas que mide tu nivel en los cinco
          dominios del SY0-701 y genera una ruta de estudio ordenada por impacto en el examen.
        </p>
        <ul className={styles.introList} role="list">
          <li>Preguntas repartidas según el peso real de cada dominio.</li>
          <li>Puedes navegar y cambiar respuestas antes de finalizar.</li>
          <li>No hay límite de tiempo: mide conocimiento, no velocidad.</li>
        </ul>

        {latest ? (
          <p className={styles.lastResult}>
            Último resultado: <strong>{latest.readinessPercent}%</strong> de preparación estimada
            ({latest.correctCount}/{latest.totalQuestions} aciertos).
          </p>
        ) : null}

        <Button variant="primary" onClick={() => void start()}>
          {latest ? 'Repetir el test' : 'Comenzar el test'}
        </Button>
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <p className={styles.state} role="status">
        Preparando las preguntas…
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.state} role="alert">
        <p>No se pudo completar el test.</p>
        <p className={styles.errorDetail}>{error}</p>
        <Button variant="primary" onClick={() => void start()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (status === 'submitting') {
    return (
      <p className={styles.state} role="status">
        Evaluando tus respuestas…
      </p>
    );
  }

  if (status === 'completed' && attempt) {
    return <DiagnosticResults attempt={attempt} onRetake={() => void start()} />;
  }

  if (!question) {
    return (
      <div className={styles.state} role="alert">
        <p>No hay preguntas disponibles.</p>
        <Button onClick={reset}>Volver</Button>
      </div>
    );
  }

  const isLast = index === total - 1;

  return (
    <section className={styles.test} aria-label="Test de diagnóstico">
      <ProgressBar
        value={answeredCount}
        max={total}
        label={`Preguntas respondidas: ${answeredCount} de ${total}`}
      />

      <QuestionCard
        question={question}
        selectedOptionIds={selection}
        onToggle={(optionId) => toggleOption(question.id, optionId)}
        position={index + 1}
        total={total}
      />

      <div className={styles.nav}>
        <Button onClick={previous} disabled={index === 0}>
          Anterior
        </Button>

        {isLast ? (
          <Button variant="primary" onClick={() => void submit()}>
            Finalizar y ver resultados
          </Button>
        ) : (
          <Button variant="primary" onClick={next}>
            Siguiente
          </Button>
        )}
      </div>

      <p className={styles.progressNote}>
        {answeredCount} de {total} respondidas. Las preguntas sin responder cuentan como fallo.
      </p>
    </section>
  );
}
